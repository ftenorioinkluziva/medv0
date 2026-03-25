import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'

export const maxDuration = 60

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20MB

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

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de arquivo não suportado. Use PDF, JPG ou PNG.' },
      { status: 422 },
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Arquivo muito grande. Tamanho máximo: 20MB.' },
      { status: 422 },
    )
  }

  // Processar em memória — nunca persistir o arquivo original
  const buffer = Buffer.from(await file.arrayBuffer())

  // TODO: Story 2.2 — passar buffer para extração via Gemini Vision
  // TODO: Story 2.3 — persistir snapshot estruturado
  void buffer

  return NextResponse.json({ success: true, fileName: file.name })
}
