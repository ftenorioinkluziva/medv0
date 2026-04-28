import { after, NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { documents, snapshots } from '@/lib/db/schema'
import { updateBodyComposition } from '@/lib/documents/body-composition'
import { triggerLivingAnalysis } from '@/lib/ai/orchestrator/trigger-living-analysis'
import { logger } from '@/lib/observability/logger'
import { errorResponse } from '@/lib/api/error-response'

const VALID_CATEGORIES = ['bioimpedance', 'blood_test', 'other'] as const
type DocumentCategory = (typeof VALID_CATEGORIES)[number]
const ParamsSchema = z.object({ id: z.string().uuid() })
const BodySchema = z.object({ category: z.enum(VALID_CATEGORIES) })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return errorResponse('Não autorizado.', 401)
  }

  const parsedParams = ParamsSchema.safeParse(await params)
  if (!parsedParams.success) {
    return errorResponse('ID de documento inválido.', 400)
  }

  const { id } = parsedParams.data

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('Corpo da requisição inválido.', 400)
  }

  const parsedBody = BodySchema.safeParse(body)
  if (!parsedBody.success) {
    return errorResponse('Categoria inválida.', 400)
  }

  const confirmedCategory: DocumentCategory = parsedBody.data.category

  const [updated] = await db
    .update(documents)
    .set({ category: confirmedCategory, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .returning({ id: documents.id })

  if (!updated) {
    return errorResponse('Documento não encontrado.', 404)
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
        logger.error('[documents/category] update body composition failed', error)
      }
    })
  } else {
    after(async () => {
      try {
        await triggerLivingAnalysis(userId, documentId)
      } catch (error) {
        logger.error('[documents/category] trigger living analysis failed', error)
      }
    })
  }

  return NextResponse.json({ success: true })
}
