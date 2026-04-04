import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { documents } from './documents'
import { healthAgents } from './health-agents'

export const livingAnalyses = pgTable('living_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
  currentVersion: integer('current_version').notNull().default(0),
  reportMarkdown: text('report_markdown').notNull().default(''),
  analysisData: jsonb('analysis_data'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const livingAnalysisVersions = pgTable('living_analysis_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  livingAnalysisId: uuid('living_analysis_id')
    .notNull()
    .references(() => livingAnalyses.id),
  version: integer('version').notNull(),
  reportMarkdown: text('report_markdown').notNull().default(''),
  analysisData: jsonb('analysis_data'),
  triggerDocumentId: uuid('trigger_document_id')
    .notNull()
    .references(() => documents.id),
  snapshotIds: jsonb('snapshot_ids').$type<string[]>().notNull().default([]),
  agentsCount: integer('agents_count').notNull().default(0),
  foundationCompleted: integer('foundation_completed').notNull().default(0),
  specializedCompleted: integer('specialized_completed').notNull().default(0),
  totalDurationMs: integer('total_duration_ms'),
  status: text('status').notNull().default('processing'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/** @deprecated Use livingAnalyses instead */
export const completeAnalyses = pgTable('complete_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  reportMarkdown: text('report_markdown').notNull().default(''),
  analysisData: jsonb('analysis_data'),
  agentsCount: integer('agents_count').notNull().default(0),
  foundationCompleted: integer('foundation_completed').notNull().default(0),
  specializedCompleted: integer('specialized_completed').notNull().default(0),
  totalDurationMs: integer('total_duration_ms'),
  status: text('status').notNull().default('processing'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  unique('complete_analyses_document_id_unique').on(table.documentId),
])

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  /** @deprecated Use livingAnalysisVersionId instead */
  completeAnalysisId: uuid('complete_analysis_id').references(
    () => completeAnalyses.id,
  ),
  livingAnalysisVersionId: uuid('living_analysis_version_id').references(
    () => livingAnalysisVersions.id,
  ),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => healthAgents.id),
  agentName: text('agent_name').notNull(),
  analysisRole: text('analysis_role').notNull(),
  content: text('content').notNull().default(''),
  ragContextUsed: boolean('rag_context_used').notNull().default(false),
  tokensUsed: integer('tokens_used'),
  durationMs: integer('duration_ms'),
  status: text('status').notNull().default('completed'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type LivingAnalysis = typeof livingAnalyses.$inferSelect
export type NewLivingAnalysis = typeof livingAnalyses.$inferInsert
export type LivingAnalysisVersion = typeof livingAnalysisVersions.$inferSelect
export type NewLivingAnalysisVersion = typeof livingAnalysisVersions.$inferInsert
/** @deprecated */
export type CompleteAnalysis = typeof completeAnalyses.$inferSelect
/** @deprecated */
export type NewCompleteAnalysis = typeof completeAnalyses.$inferInsert
export type Analysis = typeof analyses.$inferSelect
export type NewAnalysis = typeof analyses.$inferInsert
