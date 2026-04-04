import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import {
  analyses,
  documents,
  livingAnalyses,
  livingAnalysisVersions,
  snapshots,
} from '@/lib/db/schema'
import { hasUsableMedicalDocumentData } from '@/lib/documents/extractor'
import { runLivingAnalysis } from '@/lib/ai/orchestrator/living-analysis'
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

  const [triggerSnapshot] = await db
    .select({ structuredData: snapshots.structuredData })
    .from(snapshots)
    .where(eq(snapshots.documentId, documentId))
    .limit(1)

  if (!hasUsableMedicalDocumentData(triggerSnapshot?.structuredData ?? null)) {
    return NextResponse.json(
      { error: 'Não há dados extraídos suficientes para gerar a análise deste documento.' },
      { status: 409 },
    )
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

  const [existing] = await db
    .select({ id: livingAnalyses.id, currentVersion: livingAnalyses.currentVersion, status: livingAnalyses.status })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.userId, userId))
    .limit(1)

  if (existing?.status === 'processing') {
    return NextResponse.json({ livingAnalysisId: existing.id })
  }

  let livingAnalysisId: string
  let nextVersion: number

  if (existing) {
    livingAnalysisId = existing.id
    nextVersion = existing.currentVersion + 1
  } else {
    const [created] = await db
      .insert(livingAnalyses)
      .values({ userId, status: 'processing' })
      .returning({ id: livingAnalyses.id })
    livingAnalysisId = created.id
    nextVersion = 1
  }

  const userSnapshots = await db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.userId, userId))

  const [version] = await db
    .insert(livingAnalysisVersions)
    .values({
      livingAnalysisId,
      version: nextVersion,
      triggerDocumentId: documentId,
      snapshotIds: userSnapshots.map((s) => s.id),
      status: 'processing',
    })
    .returning({ id: livingAnalysisVersions.id })

  await db
    .update(livingAnalyses)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(livingAnalyses.id, livingAnalysisId))

  after(async () => {
    try {
      await runLivingAnalysis(userId, documentId, livingAnalysisId, version.id)
    } catch (error) {
      console.error('[analyses/run] Background analysis failed:', error)
    }
  })

  return NextResponse.json({ livingAnalysisId })
}
