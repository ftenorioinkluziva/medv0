import { after, NextRequest, NextResponse } from 'next/server'
import { eq, and, ne, count, gte } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { documents, snapshots } from '@/lib/db/schema'
import { extractMedicalDocument, hasUsableMedicalDocumentData } from '@/lib/documents/extractor'
import { persistFailedDocument, persistSnapshot } from '@/lib/documents/persistence'
import { classifyDocument } from '@/lib/documents/classifier'
import { updateBodyComposition } from '@/lib/documents/body-composition'
import { triggerLivingAnalysis } from '@/lib/ai/orchestrator/trigger-living-analysis'
import {
  DOCUMENT_UPLOAD_ACCEPTED_TYPES,
  DOCUMENT_UPLOAD_MAX_SIZE_BYTES,
} from '@/lib/documents/upload-config'

export const maxDuration = 90

const EXTRACTION_FAILED_MESSAGE = 'Não foi possível extrair dados utilizáveis do documento enviado.'
const VALID_CATEGORIES = ['bioimpedance', 'blood_test', 'other'] as const
const UPLOAD_RATE_LIMIT = 10 // uploads por hora
const UPLOAD_RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hora

type DocumentCategory = (typeof VALID_CATEGORIES)[number]

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - UPLOAD_RATE_WINDOW_MS)

  const result = await db
    .select({ uploadCount: count() })
    .from(documents)
    .where(and(eq(documents.userId, userId), gte(documents.createdAt, windowStart)))
    .limit(1)

  const uploadCount = result[0]?.uploadCount ?? 0

  if (uploadCount >= UPLOAD_RATE_LIMIT) {
    const oldestUpload = await db
      .select({ createdAt: documents.createdAt })
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(documents.createdAt)
      .limit(1)

    if (oldestUpload.length > 0) {
      const oldestTime = new Date(oldestUpload[0].createdAt).getTime()
      const nextAllowedTime = oldestTime + UPLOAD_RATE_WINDOW_MS
      const retryAfterMs = Math.max(0, nextAllowedTime - now.getTime())
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)

      return { allowed: false, retryAfterSeconds }
    }
  }

  return { allowed: true }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Check rate limit
  const rateLimitCheck = await checkRateLimit(session.user.id)
  if (!rateLimitCheck.allowed) {
    const response = NextResponse.json(
      {
        error: `Limite de uploads excedido. Aguarde ${rateLimitCheck.retryAfterSeconds} segundos antes de tentar novamente.`,
      },
      { status: 429 },
    )
    if (rateLimitCheck.retryAfterSeconds) {
      response.headers.set('Retry-After', rateLimitCheck.retryAfterSeconds.toString())
    }
    return response
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Erro ao processar arquivo.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
  }

  const rawCategory = formData.get('category')
  const selectedCategory =
    typeof rawCategory === 'string' && VALID_CATEGORIES.includes(rawCategory as DocumentCategory)
      ? (rawCategory as DocumentCategory)
      : null

  if (!DOCUMENT_UPLOAD_ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de arquivo não suportado. Use PDF, JPG ou PNG.' },
      { status: 422 },
    )
  }

  if (file.size > DOCUMENT_UPLOAD_MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Arquivo muito grande. Tamanho máximo: 20MB.' },
      { status: 422 },
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    const structuredData = await extractMedicalDocument(buffer, file.name, file.type)

    const [existingDoc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.userId, session.user.id),
          eq(documents.originalFileName, file.name),
          ne(documents.processingStatus, 'failed'),
        ),
      )
      .limit(1)

    if (existingDoc) {
      return NextResponse.json(
        { error: 'Este documento já foi enviado anteriormente.' },
        { status: 409 },
      )
    }

    if (!hasUsableMedicalDocumentData(structuredData)) {
      const { documentId } = await persistFailedDocument({
        userId: session.user.id,
        fileName: file.name,
        structuredData,
        processingError: EXTRACTION_FAILED_MESSAGE,
      })

      return NextResponse.json(
        { error: EXTRACTION_FAILED_MESSAGE, documentId, fileName: file.name },
        { status: 422 },
      )
    }

    const category =
      selectedCategory ?? classifyDocument(structuredData)

    const { documentId } = await persistSnapshot({
      userId: session.user.id,
      fileName: file.name,
      structuredData,
      classifiedDocumentType: category,
    })

    const type = category === 'bioimpedance' ? 'body_composition' : 'lab_test'

    after(async () => {
      try {
        if (category === 'bioimpedance') {
          const [snapshot] = await db
            .select({ structuredData: snapshots.structuredData })
            .from(snapshots)
            .where(eq(snapshots.documentId, documentId))
            .limit(1)

          if (snapshot) {
            await updateBodyComposition(session.user.id, documentId, snapshot.structuredData)
          }
        } else {
          await triggerLivingAnalysis(session.user.id, documentId)
        }
      } catch (error) {
        console.error('[documents/upload] post-upload processing failed:', error)
      }
    })

    return NextResponse.json({
      type,
      success: true,
      documentId,
      fileName: file.name,
      category,
      ...(category === 'bioimpedance' && {
        message: 'Dados de composição corporal detectados',
      }),
    })
  } catch (error) {
    console.error('[documents/upload] failed:', error)
    return NextResponse.json({ error: 'Erro interno ao salvar o exame.' }, { status: 500 })
  }
}
