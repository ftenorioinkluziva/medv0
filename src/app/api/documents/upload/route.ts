import { after, NextRequest, NextResponse } from 'next/server'
import { eq, and, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'
import { extractMedicalDocument, hasUsableMedicalDocumentData } from '@/lib/documents/extractor'
import { persistFailedDocument, persistSnapshot } from '@/lib/documents/persistence'
import { triggerLivingAnalysis } from '@/lib/ai/orchestrator/trigger-living-analysis'
import {
  DOCUMENT_UPLOAD_ACCEPTED_TYPES,
  DOCUMENT_UPLOAD_MAX_SIZE_BYTES,
} from '@/lib/documents/upload-config'

export const maxDuration = 90

const EXTRACTION_FAILED_MESSAGE = 'Não foi possível extrair dados utilizáveis do documento enviado.'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
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

    const { documentId } = await persistSnapshot({
      userId: session.user.id,
      fileName: file.name,
      structuredData,
    })

    const userId = session.user.id
    after(async () => {
      try {
        await triggerLivingAnalysis(userId, documentId)
      } catch (error) {
        console.error('[documents/upload] trigger living analysis failed:', error)
      }
    })

    return NextResponse.json({ success: true, documentId, fileName: file.name })
  } catch (error) {
    console.error('[documents/upload] failed:', error)
    return NextResponse.json({ error: 'Erro interno ao salvar o exame.' }, { status: 500 })
  }
}
