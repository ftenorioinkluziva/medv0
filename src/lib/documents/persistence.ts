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

  const documentId = await db.transaction(async (tx) => {
    const [doc] = await tx
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

    await tx.insert(snapshots).values({
      documentId: doc.id,
      userId,
      structuredData,
    })

    return doc.id
  })

  return { documentId }
}
