import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'

const VALID_CATEGORIES = ['bioimpedance', 'blood_test', 'other'] as const
type DocumentCategory = (typeof VALID_CATEGORIES)[number]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const category = (body as Record<string, unknown>)?.category
  if (!VALID_CATEGORIES.includes(category as DocumentCategory)) {
    return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 })
  }

  const [updated] = await db
    .update(documents)
    .set({ category: category as DocumentCategory, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .returning({ id: documents.id })

  if (!updated) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
