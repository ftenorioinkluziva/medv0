import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core'

export interface ModelConfig {
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  seed?: number
}

export const analysisRoleEnum = pgEnum('analysis_role', [
  'foundation',
  'specialized',
  'none',
])

export const healthAgents = pgTable('health_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  specialty: text('specialty').notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt').notNull(),
  analysisRole: analysisRoleEnum('analysis_role').notNull(),
  model: text('model').notNull().default('google/gemini-2.5-flash'),
  temperature: numeric('temperature', { precision: 3, scale: 2 }).notNull().default('0.7'),
  maxTokens: integer('max_tokens'),
  modelConfig: jsonb('model_config').$type<ModelConfig>(),
  outputSchema: jsonb('output_schema'),
  outputType: text('output_type').notNull().default('text'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type HealthAgent = typeof healthAgents.$inferSelect
export type NewHealthAgent = typeof healthAgents.$inferInsert
