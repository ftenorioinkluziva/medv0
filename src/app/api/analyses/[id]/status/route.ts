import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { livingAnalyses } from '@/lib/db/schema'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params

  const [row] = await db
    .select({
      status: livingAnalyses.status,
      reportMarkdown: livingAnalyses.reportMarkdown,
      userId: livingAnalyses.userId,
    })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.id, id))
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: 'Análise não encontrada.' }, { status: 404 })
  }

  if (row.userId !== session.user.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  if (row.status === 'completed') {
    return NextResponse.json({
      status: row.status,
      reportMarkdown: row.reportMarkdown,
    })
  }

  return NextResponse.json({ status: row.status })
}
