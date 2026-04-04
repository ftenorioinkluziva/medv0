import { desc, eq } from 'drizzle-orm'
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

const DEBOUNCE_MS = 60_000
const WAIT_POLL_MS = 5_000
const MAX_RESCHEDULE_MS = 10 * 60_000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForTriggerSlot(livingAnalysisId: string): Promise<void> {
  const deadline = Date.now() + MAX_RESCHEDULE_MS

  while (Date.now() < deadline) {
    const [latestVersion] = await db
      .select({
        createdAt: livingAnalysisVersions.createdAt,
        status: livingAnalysisVersions.status,
      })
      .from(livingAnalysisVersions)
      .where(eq(livingAnalysisVersions.livingAnalysisId, livingAnalysisId))
      .orderBy(desc(livingAnalysisVersions.version))
      .limit(1)

    if (!latestVersion) return

    if (latestVersion.status === 'processing') {
      await delay(Math.min(WAIT_POLL_MS, deadline - Date.now()))
      continue
    }

    const elapsed = Date.now() - latestVersion.createdAt.getTime()
    if (elapsed < DEBOUNCE_MS) {
      await delay(Math.min(DEBOUNCE_MS - elapsed, deadline - Date.now()))
      continue
    }

    return
  }

  console.warn('[trigger] Reschedule deadline reached, skipping')
}

export async function triggerLivingAnalysis(
  userId: string,
  triggerDocumentId: string,
): Promise<void> {
  const [foundationAgents, specializedAgents] = await Promise.all([
    getActiveAgentsByRole('foundation'),
    getActiveAgentsByRole('specialized'),
  ])

  if (foundationAgents.length === 0 || specializedAgents.length === 0) {
    console.warn('[trigger] Skipping: no active foundation/specialized agents')
    return
  }

  const [triggerSnapshot] = await db
    .select({ structuredData: snapshots.structuredData })
    .from(snapshots)
    .where(eq(snapshots.documentId, triggerDocumentId))
    .limit(1)

  if (!hasUsableMedicalDocumentData(triggerSnapshot?.structuredData ?? null)) {
    await db
      .update(documents)
      .set({
        processingStatus: 'failed',
        processingError: 'Não foi possível extrair dados utilizáveis do documento enviado.',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, triggerDocumentId))
    console.warn('[trigger] Skipping: trigger document has no usable extracted data')
    return
  }

  const [existingBeforeWait] = await db
    .select({ id: livingAnalyses.id })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.userId, userId))
    .limit(1)

  if (existingBeforeWait) {
    await waitForTriggerSlot(existingBeforeWait.id)
  }

  const [existing] = await db
    .select({ id: livingAnalyses.id, currentVersion: livingAnalyses.currentVersion })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.userId, userId))
    .limit(1)

  let livingAnalysisId: string

  if (existing) {
    livingAnalysisId = existing.id
  } else {
    const [created] = await db
      .insert(livingAnalyses)
      .values({ userId })
      .returning({ id: livingAnalyses.id })
    livingAnalysisId = created.id
  }

  const nextVersion = (existing?.currentVersion ?? 0) + 1

  const userSnapshots = await db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.userId, userId))

  const [version] = await db
    .insert(livingAnalysisVersions)
    .values({
      livingAnalysisId,
      version: nextVersion,
      triggerDocumentId,
      snapshotIds: userSnapshots.map((s) => s.id),
      status: 'processing',
    })
    .returning({ id: livingAnalysisVersions.id })

  await db
    .update(livingAnalyses)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(livingAnalyses.id, livingAnalysisId))

  await runLivingAnalysis(userId, triggerDocumentId, livingAnalysisId, version.id)
}
