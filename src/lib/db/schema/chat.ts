import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { healthAgents } from './health-agents'
import { livingAnalyses } from './analyses'

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => healthAgents.id),
    analysisId: uuid('analysis_id').references(() => livingAnalyses.id),
    title: text('title').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('chat_sessions_user_id_updated_at_idx').on(table.userId, table.updatedAt),
    index('chat_sessions_user_agent_updated_idx').on(table.userId, table.agentId, table.updatedAt),
    uniqueIndex('chat_sessions_user_id_agent_id_unique').on(table.userId, table.agentId),
  ],
)

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    tokensUsed: integer('tokens_used'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('chat_messages_session_id_idx').on(table.sessionId),
  ],
)

export type ChatSession = typeof chatSessions.$inferSelect
export type NewChatSession = typeof chatSessions.$inferInsert
export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
