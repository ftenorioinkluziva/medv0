import { embed } from 'ai'
import { cosineDistance, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { knowledgeBase, knowledgeEmbeddings } from '@/lib/db/schema'
import {
  getKnowledgeEmbeddingModel,
  getKnowledgeEmbeddingProviderOptions,
} from './embedding-model'

export interface KnowledgeChunk {
  articleId: string
  chunkIndex: number
  content: string
  snippet: string
  score: number
  article: {
    title: string
    source: string | null
    author: string | null
    category: string | null
    isVerified: string
  }
}

interface SearchRow {
  articleId: string
  chunkIndex: number
  content: string
  score: number
  title: string
  source: string | null
  author: string | null
  category: string | null
  isVerified: string
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function createSnippet(query: string, content: string, maxLength: number = 220): string {
  const normalizedContent = collapseWhitespace(content)
  if (normalizedContent.length <= maxLength) {
    return normalizedContent
  }

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4)

  const contentLower = normalizedContent.toLowerCase()
  const firstMatchIndex = queryTerms
    .map((term) => contentLower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0]

  if (firstMatchIndex == null) {
    return `${normalizedContent.slice(0, maxLength).trimEnd()}...`
  }

  const start = Math.max(0, firstMatchIndex - 48)
  const end = Math.min(normalizedContent.length, start + maxLength)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < normalizedContent.length ? '...' : ''

  return `${prefix}${normalizedContent.slice(start, end).trim()}${suffix}`
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getKnowledgeEmbeddingModel(),
    value: query,
    providerOptions: getKnowledgeEmbeddingProviderOptions('RETRIEVAL_QUERY'),
  })
  return embedding
}

function dedupeRowsByArticle(rows: SearchRow[], topK: number): SearchRow[] {
  const uniqueRows = new Map<string, SearchRow>()

  for (const row of rows) {
    if (!uniqueRows.has(row.articleId)) {
      uniqueRows.set(row.articleId, row)
    }

    if (uniqueRows.size >= topK) {
      break
    }
  }

  return Array.from(uniqueRows.values())
}

export async function searchKnowledge(
  query: string,
  topK: number = 5,
): Promise<KnowledgeChunk[]> {
  const queryEmbedding = await generateQueryEmbedding(query)

  const similarity = sql<number>`1 - (${cosineDistance(knowledgeEmbeddings.embedding, queryEmbedding)})`

  const rows = await db
    .select({
      articleId: knowledgeEmbeddings.articleId,
      chunkIndex: knowledgeEmbeddings.chunkIndex,
      content: knowledgeEmbeddings.content,
      score: similarity,
      title: knowledgeBase.title,
      source: knowledgeBase.source,
      author: knowledgeBase.author,
      category: knowledgeBase.category,
      isVerified: knowledgeBase.isVerified,
    })
    .from(knowledgeEmbeddings)
    .innerJoin(knowledgeBase, eq(knowledgeEmbeddings.articleId, knowledgeBase.id))
    .orderBy(desc(similarity))
    .limit(Math.max(topK * 5, topK))

  const dedupedRows = dedupeRowsByArticle(rows, topK)

  return dedupedRows.map((r) => ({
    articleId: r.articleId,
    chunkIndex: r.chunkIndex,
    content: r.content,
    snippet: createSnippet(query, r.content),
    score: r.score,
    article: {
      title: r.title,
      source: r.source,
      author: r.author,
      category: r.category,
      isVerified: r.isVerified,
    },
  }))
}

export async function incrementUsageCount(articleId: string): Promise<void> {
  await db
    .update(knowledgeBase)
    .set({
      usageCount: sql`${knowledgeBase.usageCount} + 1`,
      lastAnalyzedAt: new Date(),
    })
    .where(eq(knowledgeBase.id, articleId))
}
