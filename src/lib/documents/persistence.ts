import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { documents, snapshots } from '@/lib/db/schema'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

export interface PersistSnapshotInput {
  userId: string
  fileName: string
  structuredData: SanitizedMedicalDocument
}

export interface PersistSnapshotResult {
  documentId: string
}

export async function persistSnapshot(input: PersistSnapshotInput): Promise<PersistSnapshotResult> {
  const { userId, fileName, structuredData } = input

  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      documentType: structuredData.documentType,
      originalFileName: fileName,
      examDate: structuredData.examDate ?? null,
      extractedAt: new Date(),
      overallSummary: structuredData.overallSummary ?? null,
      processingStatus: 'completed',
    })
    .returning({ id: documents.id })

  try {
    await db.insert(snapshots).values({
      documentId: doc.id,
      userId,
      structuredData,
    })
  } catch (error) {
    await db.delete(documents).where(eq(documents.id, doc.id))
    throw error
  }

  return { documentId: doc.id }
}
