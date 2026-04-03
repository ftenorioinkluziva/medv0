import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { analyses, completeAnalyses, documents } from '@/lib/db/schema'
import { runCompleteAnalysis } from '@/lib/ai/orchestrator/complete-analysis'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'

export const maxDuration = 60

const RunAnalysisSchema = z.object({
  documentId: z.string().uuid(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const parsed = RunAnalysisSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validação falhou.', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { documentId } = parsed.data
  const userId = session.user.id

  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1)

  if (!doc) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  }

  const [foundationAgents, specializedAgents] = await Promise.all([
    getActiveAgentsByRole('foundation'),
    getActiveAgentsByRole('specialized'),
  ])

  if (foundationAgents.length === 0 || specializedAgents.length === 0) {
    return NextResponse.json(
      {
        error:
          'Configuração incompleta de agentes. É necessário pelo menos 1 agente foundation e 1 specialized ativos.',
      },
      { status: 409 },
    )
  }

  const [existingCompleteAnalysis] = await db
    .select({
      id: completeAnalyses.id,
      status: completeAnalyses.status,
    })
    .from(completeAnalyses)
    .where(and(eq(completeAnalyses.documentId, documentId), eq(completeAnalyses.userId, userId)))
    .limit(1)

  if (existingCompleteAnalysis?.status === 'processing') {
    return NextResponse.json({ completeAnalysisId: existingCompleteAnalysis.id })
  }

  const completeAnalysisId = existingCompleteAnalysis?.id ?? crypto.randomUUID()

  if (existingCompleteAnalysis) {
    await db.delete(analyses).where(eq(analyses.completeAnalysisId, completeAnalysisId))

    await db
      .update(completeAnalyses)
      .set({
        reportMarkdown: '',
        analysisData: null,
        agentsCount: 0,
        foundationCompleted: 0,
        specializedCompleted: 0,
        totalDurationMs: null,
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(completeAnalyses.id, completeAnalysisId))
  } else {
    await db.insert(completeAnalyses).values({
      id: completeAnalysisId,
      userId,
      documentId,
      reportMarkdown: '',
      agentsCount: 0,
      foundationCompleted: 0,
      specializedCompleted: 0,
      status: 'processing',
    })
  }

  after(async () => {
    try {
      await runCompleteAnalysis(userId, documentId, completeAnalysisId)
    } catch (error) {
      console.error('[analyses/run] Background analysis failed:', error)
    }
  })

  return NextResponse.json({ completeAnalysisId })
}
