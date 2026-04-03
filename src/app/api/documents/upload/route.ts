import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { extractMedicalDocument } from '@/lib/documents/extractor'
import { persistSnapshot } from '@/lib/documents/persistence'
import {
  DOCUMENT_UPLOAD_ACCEPTED_TYPES,
  DOCUMENT_UPLOAD_MAX_SIZE_BYTES,
  DOCUMENT_UPLOAD_SERVER_MAX_DURATION_SECONDS,
} from '@/lib/documents/upload-config'

export const maxDuration = DOCUMENT_UPLOAD_SERVER_MAX_DURATION_SECONDS

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

  // Processar em memória — nunca persistir o arquivo original
  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    const structuredData = await extractMedicalDocument(buffer, file.name, file.type)

    const { documentId } = await persistSnapshot({
      userId: session.user.id,
      fileName: file.name,
      structuredData,
    })

    return NextResponse.json({ success: true, documentId, fileName: file.name })
  } catch (error) {
    console.error('[documents/upload] failed:', error)
    return NextResponse.json({ error: 'Erro interno ao salvar o exame.' }, { status: 500 })
  }
}
