import { pgTable, uuid, text, integer, timestamp, date, index, customType, boolean, unique } from 'drizzle-orm/pg-core'
import { vector } from 'drizzle-orm/pg-core'
import { healthAgents } from './health-agents'

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const knowledgeBase = pgTable(
  'knowledge_base',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    summary: text('summary'),
    source: text('source'),
    author: text('author'),
    publishedDate: date('published_date'),
    category: text('category'),
    subcategory: text('subcategory'),
    tags: text('tags').array(),
    language: text('language').notNull().default('pt-BR'),
    isVerified: text('is_verified').notNull().default('unverified'),
    isGlobal: boolean('is_global').notNull().default(true),
    usageCount: integer('usage_count').notNull().default(0),
    lastAnalyzedAt: timestamp('last_analyzed_at'),
    analysisVersion: text('analysis_version'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('knowledge_base_source_idx').on(table.source)],
)

export const knowledgeEmbeddings = pgTable(
  'knowledge_embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    contentTsv: tsvector('content_tsv'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('knowledge_embeddings_hnsw_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
    index('knowledge_embeddings_gin_idx').using('gin', table.contentTsv),
  ],
)

export const agentKnowledge = pgTable(
  'agent_knowledge',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => healthAgents.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('agent_knowledge_agent_article_unique').on(table.agentId, table.articleId),
    index('agent_knowledge_agent_id_idx').on(table.agentId),
    index('agent_knowledge_article_id_idx').on(table.articleId),
  ],
)

export type KnowledgeBase = typeof knowledgeBase.$inferSelect
export type NewKnowledgeBase = typeof knowledgeBase.$inferInsert
export type KnowledgeEmbedding = typeof knowledgeEmbeddings.$inferSelect
export type NewKnowledgeEmbedding = typeof knowledgeEmbeddings.$inferInsert
export type AgentKnowledge = typeof agentKnowledge.$inferSelect
export type NewAgentKnowledge = typeof agentKnowledge.$inferInsert
