import { pgTable, uuid, text, integer, timestamp, date, index, customType } from 'drizzle-orm/pg-core'
import { vector } from 'drizzle-orm/pg-core'

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

export type KnowledgeBase = typeof knowledgeBase.$inferSelect
export type NewKnowledgeBase = typeof knowledgeBase.$inferInsert
export type KnowledgeEmbedding = typeof knowledgeEmbeddings.$inferSelect
export type NewKnowledgeEmbedding = typeof knowledgeEmbeddings.$inferInsert
