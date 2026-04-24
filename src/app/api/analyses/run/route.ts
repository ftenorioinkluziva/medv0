import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, count, gte } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import {
  documents,
  livingAnalyses,
  livingAnalysisVersions,
  snapshots,
} from '@/lib/db/schema'
import { hasUsableMedicalDocumentData } from '@/lib/documents/extractor'
import { runLivingAnalysis } from '@/lib/ai/orchestrator/living-analysis'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'
import { logger } from '@/lib/observability/logger'
import { errorResponse } from '@/lib/api/error-response'

export const maxDuration = 60

const ANALYSIS_RATE_LIMIT = 5 // análises por hora
const ANALYSIS_RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hora

const RunAnalysisSchema = z.object({
  documentId: z.string().uuid(),
})

async function checkAnalysisRateLimit(userId: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - ANALYSIS_RATE_WINDOW_MS)

  const userLivingAnalysis = await db
    .select({ id: livingAnalyses.id })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.userId, userId))
    .limit(1)

  if (!userLivingAnalysis[0]) {
    return { allowed: true }
  }

  const livingAnalysisId = userLivingAnalysis[0].id

  const versionCountResult = await db
    .select({ analysisCount: count() })
    .from(livingAnalysisVersions)
    .where(
      and(
        eq(livingAnalysisVersions.livingAnalysisId, livingAnalysisId),
        gte(livingAnalysisVersions.createdAt, windowStart),
      ),
    )

  const analysisCount = versionCountResult[0]?.analysisCount ?? 0

  if (analysisCount >= ANALYSIS_RATE_LIMIT) {
    const oldestAnalysis = await db
      .select({ createdAt: livingAnalysisVersions.createdAt })
      .from(livingAnalysisVersions)
      .where(eq(livingAnalysisVersions.livingAnalysisId, livingAnalysisId))
      .orderBy(livingAnalysisVersions.createdAt)
      .limit(1)

    if (oldestAnalysis[0]) {
      const oldestTime = new Date(oldestAnalysis[0].createdAt).getTime()
      const nextAllowedTime = oldestTime + ANALYSIS_RATE_WINDOW_MS
      const retryAfterMs = Math.max(0, nextAllowedTime - now.getTime())
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)

      return { allowed: false, retryAfterSeconds }
    }
  }

  return { allowed: true }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return errorResponse('Não autorizado.', 401)
  }

  // Check rate limit
  const rateLimitCheck = await checkAnalysisRateLimit(session.user.id)
  if (!rateLimitCheck.allowed) {
    const response = NextResponse.json(
      {
        error: `Limite de análises excedido. Aguarde ${rateLimitCheck.retryAfterSeconds} segundos antes de tentar novamente.`,
      },
      { status: 429 },
    )
    if (rateLimitCheck.retryAfterSeconds) {
      response.headers.set('Retry-After', rateLimitCheck.retryAfterSeconds.toString())
    }
    return response
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('Payload inválido.', 400)
  }

  const parsed = RunAnalysisSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('Validação falhou.', 400, parsed.error.flatten())
  }

  const { documentId } = parsed.data
  const userId = session.user.id

  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1)

  if (!doc) {
    return errorResponse('Documento não encontrado.', 404)
  }

  const [triggerSnapshot] = await db
    .select({ structuredData: snapshots.structuredData })
    .from(snapshots)
    .where(eq(snapshots.documentId, documentId))
    .limit(1)

  if (!hasUsableMedicalDocumentData(triggerSnapshot?.structuredData ?? null)) {
    return errorResponse('Não há dados extraídos suficientes para gerar a análise deste documento.', 409)
  }

  const foundationAgents = await getActiveAgentsByRole('foundation')

  if (foundationAgents.length === 0) {
    return errorResponse(
      'Configuração incompleta de agentes. É necessário pelo menos 1 agente foundation ativo.',
      409,
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
      logger.error('[analyses/run] Background analysis failed', error)
    }
  })

  return NextResponse.json({ livingAnalysisId })
}
