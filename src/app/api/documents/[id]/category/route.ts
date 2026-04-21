import { after, NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { documents, snapshots } from '@/lib/db/schema'
import { updateBodyComposition } from '@/lib/documents/body-composition'
import { triggerLivingAnalysis } from '@/lib/ai/orchestrator/trigger-living-analysis'

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

  const confirmedCategory = category as DocumentCategory

  const [updated] = await db
    .update(documents)
    .set({ category: confirmedCategory, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .returning({ id: documents.id })

  if (!updated) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  }

  const userId = session.user.id
  const documentId = id

  if (confirmedCategory === 'bioimpedance') {
    after(async () => {
      try {
        const [snapshot] = await db
          .select({ structuredData: snapshots.structuredData })
          .from(snapshots)
          .where(eq(snapshots.documentId, documentId))
          .limit(1)

        if (snapshot) {
          await updateBodyComposition(userId, documentId, snapshot.structuredData)
        }
      } catch (error) {
        console.error('[documents/category] update body composition failed:', error)
      }
    })
  } else {
    after(async () => {
      try {
        await triggerLivingAnalysis(userId, documentId)
      } catch (error) {
        console.error('[documents/category] trigger living analysis failed:', error)
      }
    })
  }

  return NextResponse.json({ success: true })
}
