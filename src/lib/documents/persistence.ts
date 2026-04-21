import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { documents, snapshots } from '@/lib/db/schema'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'
import { classifyDocument, type DocumentClassification } from '@/lib/documents/classifier'

export interface PersistSnapshotInput {
  userId: string
  fileName: string
  structuredData: SanitizedMedicalDocument
  classifiedDocumentType?: DocumentClassification
}

export interface PersistSnapshotResult {
  documentId: string
}

interface InsertDocumentInput {
  userId: string
  fileName: string
  structuredData: SanitizedMedicalDocument
  processingStatus: 'completed' | 'failed'
  processingError?: string | null
  category?: DocumentClassification | null
}

function sanitizeDate(value: string | undefined | null): string | null {
  if (!value || value === 'null' || value === 'undefined') return null
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : value
}

async function insertDocument(input: InsertDocumentInput): Promise<string> {
  const { userId, fileName, structuredData, processingStatus, processingError, category } = input

  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      documentType: structuredData.documentType,
      originalFileName: fileName,
      examDate: sanitizeDate(structuredData.examDate),
      extractedAt: new Date(),
      overallSummary: structuredData.overallSummary ?? null,
      category: category ?? null,
      processingStatus,
      processingError: processingError ?? null,
    })
    .returning({ id: documents.id })

  return doc.id
}

export async function persistSnapshot(input: PersistSnapshotInput): Promise<PersistSnapshotResult> {
  const { userId, fileName, structuredData, classifiedDocumentType } = input
  const persistedStructuredData = classifiedDocumentType
    ? { ...structuredData, documentType: classifiedDocumentType }
    : structuredData

  const category = classifiedDocumentType ?? classifyDocument(structuredData)

  const documentId = await insertDocument({
    userId,
    fileName,
    structuredData: persistedStructuredData,
    processingStatus: 'completed',
    category,
  })

  try {
    await db.insert(snapshots).values({
      documentId,
      userId,
      structuredData: persistedStructuredData,
    })
  } catch (error) {
    await db.delete(documents).where(eq(documents.id, documentId))
    throw error
  }

  return { documentId }
}

export interface PersistFailedDocumentInput {
  userId: string
  fileName: string
  structuredData: SanitizedMedicalDocument
  processingError: string
}

export async function persistFailedDocument(
  input: PersistFailedDocumentInput,
): Promise<PersistSnapshotResult> {
  const documentId = await insertDocument({
    userId: input.userId,
    fileName: input.fileName,
    structuredData: input.structuredData,
    processingStatus: 'failed',
    processingError: input.processingError,
    category: 'other',
  })

  return { documentId }
}
