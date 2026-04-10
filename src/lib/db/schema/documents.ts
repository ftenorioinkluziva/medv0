import { pgTable, uuid, text, date, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'
import { users } from './users'

export const processingStatusEnum = pgEnum('processing_status', ['processing', 'completed', 'failed'])

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    documentType: text('document_type').notNull(),
    originalFileName: text('original_file_name').notNull(),
    examDate: date('exam_date'),
    extractedAt: timestamp('extracted_at').notNull(),
    overallSummary: text('overall_summary'),
    processingStatus: processingStatusEnum('processing_status').notNull().default('completed'),
    processingError: text('processing_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('documents_user_id_idx').on(table.userId)],
)

export const snapshots = pgTable(
  'snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .unique()
      .references(() => documents.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    structuredData: jsonb('structured_data')
      .$type<SanitizedMedicalDocument>()
      .notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('snapshots_user_id_created_at_idx').on(table.userId, table.createdAt)],
)

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type Snapshot = typeof snapshots.$inferSelect
export type NewSnapshot = typeof snapshots.$inferInsert
