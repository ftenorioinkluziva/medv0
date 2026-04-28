import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { documents, snapshots, livingAnalyses, livingAnalysisVersions } from '@/lib/db/schema'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

export type DocumentCategory = 'bioimpedance' | 'blood_test' | 'other'

export type DocumentWithHistory = {
  id: string
  documentType: string
  originalFileName: string
  examDate: string | null
  createdAt: Date
  processingStatus: string
  category: DocumentCategory | null
  snapshot: { structuredData: SanitizedMedicalDocument } | null
  livingAnalysis: { id: string; status: string; updatedAt: Date; currentTriggerDocumentId: string | null } | null
}

export type AnalysisHistoryItem = {
  id: string
  livingAnalysisId: string
  version: number
  status: string
  createdAt: Date
  triggerDocumentId: string
  triggerDocumentType: string
  triggerDocumentFileName: string
  triggerDocumentExamDate: string | null
  agentsCount: number
  foundationCompleted: number
  specializedCompleted: number
  totalDurationMs: number | null
  isCurrent: boolean
}

export type HistoryData = {
  documents: DocumentWithHistory[]
  analyses: AnalysisHistoryItem[]
}

export async function getHistoryData(userId: string): Promise<HistoryData> {
  const [livingAnalysis] = await db
    .select({
      id: livingAnalyses.id,
      status: livingAnalyses.status,
      updatedAt: livingAnalyses.updatedAt,
      currentVersion: livingAnalyses.currentVersion,
    })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.userId, userId))
    .limit(1)

  let currentTriggerDocumentId: string | null = null
  let analysesHistory: AnalysisHistoryItem[] = []

  if (livingAnalysis) {
    const [currentVersion] = await db
      .select({ triggerDocumentId: livingAnalysisVersions.triggerDocumentId })
      .from(livingAnalysisVersions)
      .where(eq(livingAnalysisVersions.livingAnalysisId, livingAnalysis.id))
      .orderBy(desc(livingAnalysisVersions.version))
      .limit(1)

    currentTriggerDocumentId = currentVersion?.triggerDocumentId ?? null

    const versionRows = await db
      .select({
        id: livingAnalysisVersions.id,
        livingAnalysisId: livingAnalysisVersions.livingAnalysisId,
        version: livingAnalysisVersions.version,
        status: livingAnalysisVersions.status,
        createdAt: livingAnalysisVersions.createdAt,
        triggerDocumentId: livingAnalysisVersions.triggerDocumentId,
        triggerDocumentType: documents.documentType,
        triggerDocumentFileName: documents.originalFileName,
        triggerDocumentExamDate: documents.examDate,
        agentsCount: livingAnalysisVersions.agentsCount,
        foundationCompleted: livingAnalysisVersions.foundationCompleted,
        specializedCompleted: livingAnalysisVersions.specializedCompleted,
        totalDurationMs: livingAnalysisVersions.totalDurationMs,
      })
      .from(livingAnalysisVersions)
      .innerJoin(documents, eq(documents.id, livingAnalysisVersions.triggerDocumentId))
      .where(eq(livingAnalysisVersions.livingAnalysisId, livingAnalysis.id))
      .orderBy(desc(livingAnalysisVersions.version))

    analysesHistory = versionRows.map((row) => ({
      ...row,
      isCurrent: row.version === livingAnalysis.currentVersion,
    }))
  }

  const rows = await db
    .select({
      id: documents.id,
      documentType: documents.documentType,
      originalFileName: documents.originalFileName,
      examDate: documents.examDate,
      createdAt: documents.createdAt,
      processingStatus: documents.processingStatus,
      category: documents.category,
      snapshotStructuredData: snapshots.structuredData,
    })
    .from(documents)
    .leftJoin(snapshots, eq(snapshots.documentId, documents.id))
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.examDate), desc(documents.createdAt))

  return {
    documents: rows.map((row) => ({
      id: row.id,
      documentType: row.documentType,
      originalFileName: row.originalFileName,
      examDate: row.examDate,
      createdAt: row.createdAt,
      processingStatus: row.processingStatus,
      category: (row.category as DocumentCategory | null) ?? null,
      snapshot: row.snapshotStructuredData
        ? { structuredData: row.snapshotStructuredData }
        : null,
      livingAnalysis: livingAnalysis
        ? {
            id: livingAnalysis.id,
            status: livingAnalysis.status,
            updatedAt: livingAnalysis.updatedAt,
            currentTriggerDocumentId,
          }
        : null,
    })),
    analyses: analysesHistory,
  }
}

export async function getDocumentsWithHistory(userId: string): Promise<DocumentWithHistory[]> {
  const history = await getHistoryData(userId)
  return history.documents
}
