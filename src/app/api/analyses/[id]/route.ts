import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { livingAnalyses } from '@/lib/db/schema'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params

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
    return NextResponse.json({ error: 'Relatório não encontrado.' }, { status: 404 })
  }

  if (row.userId !== session.user.id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  return NextResponse.json({
    reportMarkdown: row.reportMarkdown,
    createdAt: row.createdAt,
    currentVersion: row.currentVersion,
    agentsCount: row.agentsCount,
  })
}
