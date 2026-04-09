import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { documents, snapshots, livingAnalyses, livingAnalysisVersions } from '@/lib/db/schema'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

export type DocumentWithHistory = {
  id: string
  documentType: string
  originalFileName: string
  examDate: string | null
  createdAt: Date
  processingStatus: string
  snapshot: { structuredData: SanitizedMedicalDocument } | null
  livingAnalysis: { id: string; status: string; updatedAt: Date; currentTriggerDocumentId: string | null } | null
}

export async function getDocumentsWithHistory(userId: string): Promise<DocumentWithHistory[]> {
  const [livingAnalysis] = await db
    .select({
      id: livingAnalyses.id,
      status: livingAnalyses.status,
      updatedAt: livingAnalyses.updatedAt,
    })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.userId, userId))
    .limit(1)

  let currentTriggerDocumentId: string | null = null

  if (livingAnalysis) {
    const [currentVersion] = await db
      .select({ triggerDocumentId: livingAnalysisVersions.triggerDocumentId })
      .from(livingAnalysisVersions)
      .where(eq(livingAnalysisVersions.livingAnalysisId, livingAnalysis.id))
      .orderBy(desc(livingAnalysisVersions.version))
      .limit(1)

    currentTriggerDocumentId = currentVersion?.triggerDocumentId ?? null
  }

  const rows = await db
    .select({
      id: documents.id,
      documentType: documents.documentType,
      originalFileName: documents.originalFileName,
      examDate: documents.examDate,
      createdAt: documents.createdAt,
      processingStatus: documents.processingStatus,
      snapshotStructuredData: snapshots.structuredData,
    })
    .from(documents)
    .leftJoin(snapshots, eq(snapshots.documentId, documents.id))
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.examDate), desc(documents.createdAt))

  return rows.map((row) => ({
    id: row.id,
    documentType: row.documentType,
    originalFileName: row.originalFileName,
    examDate: row.examDate,
    createdAt: row.createdAt,
    processingStatus: row.processingStatus,
    snapshot: row.snapshotStructuredData
      ? { structuredData: row.snapshotStructuredData }
      : null,
    livingAnalysis: livingAnalysis
      ? {
          ...livingAnalysis,
          currentTriggerDocumentId,
        }
      : null,
  }))
}
