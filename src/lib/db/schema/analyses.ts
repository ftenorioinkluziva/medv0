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
  completeAnalysisId: uuid('complete_analysis_id').references(
    () => completeAnalyses.id,
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

export type CompleteAnalysis = typeof completeAnalyses.$inferSelect
export type NewCompleteAnalysis = typeof completeAnalyses.$inferInsert
export type Analysis = typeof analyses.$inferSelect
export type NewAnalysis = typeof analyses.$inferInsert
