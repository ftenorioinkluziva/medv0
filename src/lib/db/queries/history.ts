import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { documents, snapshots, completeAnalyses } from '@/lib/db/schema'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

export type DocumentWithHistory = {
  id: string
  documentType: string
  originalFileName: string
  examDate: string | null
  createdAt: Date
  processingStatus: string
  snapshot: { structuredData: SanitizedMedicalDocument } | null
  completeAnalysis: { id: string; status: string; createdAt: Date } | null
}

export async function getDocumentsWithHistory(userId: string): Promise<DocumentWithHistory[]> {
  const rows = await db
    .select({
      id: documents.id,
      documentType: documents.documentType,
      originalFileName: documents.originalFileName,
      examDate: documents.examDate,
      createdAt: documents.createdAt,
      processingStatus: documents.processingStatus,
      snapshotStructuredData: snapshots.structuredData,
      analysisId: completeAnalyses.id,
      analysisStatus: completeAnalyses.status,
      analysisCreatedAt: completeAnalyses.createdAt,
    })
    .from(documents)
    .leftJoin(snapshots, eq(snapshots.documentId, documents.id))
    .leftJoin(completeAnalyses, eq(completeAnalyses.documentId, documents.id))
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
    completeAnalysis: row.analysisId
      ? {
          id: row.analysisId,
          status: row.analysisStatus ?? 'completed',
          createdAt: row.analysisCreatedAt ?? new Date(),
        }
      : null,
  }))
}
