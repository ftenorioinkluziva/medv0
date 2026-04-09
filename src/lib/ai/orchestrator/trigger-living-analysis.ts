import { eq } from 'drizzle-orm'
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

export async function triggerLivingAnalysis(
  userId: string,
  triggerDocumentId: string,
): Promise<void> {
  const foundationAgents = await getActiveAgentsByRole('foundation')

  if (foundationAgents.length === 0) {
    console.warn('[trigger] Skipping: no active foundation agents')
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

  const [existing] = await db
    .select({ id: livingAnalyses.id, currentVersion: livingAnalyses.currentVersion, status: livingAnalyses.status })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.userId, userId))
    .limit(1)

  if (existing?.status === 'processing') {
    console.info('[trigger] Skipping: analysis already processing')
    return
  }

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
