import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { livingAnalyses } from '@/lib/db/schema'
import { errorResponse } from '@/lib/api/error-response'

const ParamsSchema = z.object({ id: z.string().uuid() })

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return errorResponse('Não autorizado.', 401)
  }

  const parsedParams = ParamsSchema.safeParse(await params)
  if (!parsedParams.success) {
    return errorResponse('ID de análise inválido.', 400)
  }

  const { id } = parsedParams.data

  const [row] = await db
    .select({
      reportMarkdown: livingAnalyses.reportMarkdown,
      createdAt: livingAnalyses.createdAt,
      currentVersion: livingAnalyses.currentVersion,
      agentsCount: livingAnalyses.agentsCount,
      userId: livingAnalyses.userId,
    })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.id, id))
    .limit(1)

  if (!row) {
    return errorResponse('Relatório não encontrado.', 404)
  }

  if (row.userId !== session.user.id) {
    return errorResponse('Acesso negado.', 403)
  }

  return NextResponse.json({
    reportMarkdown: row.reportMarkdown,
    createdAt: row.createdAt,
    currentVersion: row.currentVersion,
    agentsCount: row.agentsCount,
  })
}
