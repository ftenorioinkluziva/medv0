import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { livingAnalysisVersions } from './analyses'
import { healthAgents } from './health-agents'

export const generatedProducts = pgTable(
  'generated_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    livingAnalysisVersionId: uuid('living_analysis_version_id')
      .notNull()
      .references(() => livingAnalysisVersions.id),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => healthAgents.id),
    productType: text('product_type').notNull(), // supplementation | meals | workout
    content: jsonb('content'),
    status: text('status').notNull().default('processing'), // processing | completed | failed
    errorMessage: text('error_message'),
    tokensUsed: integer('tokens_used'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('generated_products_user_id_idx').on(table.userId),
    index('generated_products_version_id_idx').on(table.livingAnalysisVersionId),
  ],
)

export type GeneratedProduct = typeof generatedProducts.$inferSelect
export type NewGeneratedProduct = typeof generatedProducts.$inferInsert
