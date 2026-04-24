import { after, NextRequest, NextResponse } from 'next/server'
import { eq, and, ne, count, gte } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { documents, snapshots } from '@/lib/db/schema'
import { extractMedicalDocument, hasUsableMedicalDocumentData } from '@/lib/documents/extractor'
import { persistFailedDocument, persistSnapshot } from '@/lib/documents/persistence'
import { classifyDocument } from '@/lib/documents/classifier'
import { updateBodyComposition } from '@/lib/documents/body-composition'
import { triggerLivingAnalysis } from '@/lib/ai/orchestrator/trigger-living-analysis'
import { validateUpload } from '@/lib/documents/upload-validation'
import {
  DOCUMENT_UPLOAD_EXTRACTION_TIMEOUT_MS,
  DOCUMENT_UPLOAD_SERVER_MAX_DURATION_SECONDS,
} from '@/lib/documents/upload-config'
import { logger } from '@/lib/observability/logger'
import { errorResponse } from '@/lib/api/error-response'

export const maxDuration = DOCUMENT_UPLOAD_SERVER_MAX_DURATION_SECONDS

const EXTRACTION_FAILED_MESSAGE = 'Não foi possível extrair dados utilizáveis do documento enviado.'
const EXTRACTION_TIMEOUT_MESSAGE = 'Processamento do arquivo excedeu o tempo limite. Tente novamente.'
const VALID_CATEGORIES = ['bioimpedance', 'blood_test', 'other'] as const
const CategorySchema = z.enum(VALID_CATEGORIES)
const UPLOAD_RATE_LIMIT = 10 // uploads por hora
const UPLOAD_RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hora
class UploadProcessingTimeoutError extends Error {}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new UploadProcessingTimeoutError(EXTRACTION_TIMEOUT_MESSAGE))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

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
    return errorResponse('Não autorizado.', 401)
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
    return errorResponse('Erro ao processar arquivo.', 400)
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return errorResponse('Nenhum arquivo enviado.', 400)
  }

  const rawCategory = formData.get('category')
  const parsedCategory = CategorySchema.safeParse(rawCategory)
  const selectedCategory = parsedCategory.success ? parsedCategory.data : null

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // Validar arquivo (tamanho, MIME type, signature, nome)
    const validation = validateUpload(file, buffer)
    if (!validation.valid) {
      return errorResponse(validation.error ?? 'Arquivo inválido.', 422)
    }

    const uploadFileName = validation.sanitizedFileName || file.name
    const uploadMimeType = validation.mimeType || file.type

    const structuredData = await withTimeout(
      extractMedicalDocument(buffer, uploadFileName, uploadMimeType),
      DOCUMENT_UPLOAD_EXTRACTION_TIMEOUT_MS,
    )

    const [existingDoc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.userId, session.user.id),
          eq(documents.originalFileName, uploadFileName),
          ne(documents.processingStatus, 'failed'),
        ),
      )
      .limit(1)

    if (existingDoc) {
      return errorResponse('Este documento já foi enviado anteriormente.', 409)
    }

    if (!hasUsableMedicalDocumentData(structuredData)) {
      const { documentId } = await persistFailedDocument({
        userId: session.user.id,
        fileName: uploadFileName,
        structuredData,
        processingError: EXTRACTION_FAILED_MESSAGE,
      })

      return NextResponse.json(
        { error: EXTRACTION_FAILED_MESSAGE, documentId, fileName: uploadFileName },
        { status: 422 },
      )
    }

    const category =
      selectedCategory ?? classifyDocument(structuredData)

    const { documentId } = await persistSnapshot({
      userId: session.user.id,
      fileName: uploadFileName,
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
        logger.error('[documents/upload] post-upload processing failed', error)
      }
    })

    return NextResponse.json({
      type,
      success: true,
      documentId,
      fileName: uploadFileName,
      category,
      ...(category === 'bioimpedance' && {
        message: 'Dados de composição corporal detectados',
      }),
    })
  } catch (error) {
    if (error instanceof UploadProcessingTimeoutError) {
      return errorResponse(EXTRACTION_TIMEOUT_MESSAGE, 408)
    }

    logger.error('[documents/upload] failed', error)
    return errorResponse('Erro interno ao salvar o exame.', 500)
  }
}
