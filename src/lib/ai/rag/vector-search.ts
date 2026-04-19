import { embed } from 'ai'
import { and, cosineDistance, desc, eq, sql } from 'drizzle-orm'
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

// Reciprocal Rank Fusion — combines vector and BM25 rankings
// k=60 is the standard constant that dampens rank differences
const RRF_K = 60

function reciprocalRankFusion(
  vectorRows: SearchRow[],
  bm25Rows: SearchRow[],
): SearchRow[] {
  const scores = new Map<string, { row: SearchRow; rrfScore: number }>()

  const key = (r: SearchRow) => `${r.articleId}:${r.chunkIndex}`

  vectorRows.forEach((row, rank) => {
    const k = key(row)
    const prev = scores.get(k)
    const rrfScore = (prev?.rrfScore ?? 0) + 1 / (RRF_K + rank + 1)
    scores.set(k, { row, rrfScore })
  })

  bm25Rows.forEach((row, rank) => {
    const k = key(row)
    const prev = scores.get(k)
    const rrfScore = (prev?.rrfScore ?? 0) + 1 / (RRF_K + rank + 1)
    scores.set(k, { row: prev?.row ?? row, rrfScore })
  })

  return Array.from(scores.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map(({ row, rrfScore }) => ({ ...row, score: rrfScore }))
}

// Converts a plain query string into a tsquery-compatible string using OR (|).
// OR maximizes recall: a chunk matches if it contains ANY of the query terms.
// e.g. "colesterol triglicerídeos insulina" → "colesterol | triglicerid | insulin"
function toTsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[^a-zA-Z0-9À-ÿ]/g, ''))
    .filter((term) => term.length >= 3)
    .join(' | ')
}

export async function searchKnowledge(
  query: string,
  topK: number = 5,
  agentId?: string,
): Promise<KnowledgeChunk[]> {
  const candidateLimit = Math.max(topK * 5, 25)

  const [queryEmbedding, tsQuery] = await Promise.all([
    generateQueryEmbedding(query),
    Promise.resolve(toTsQuery(query)),
  ])

  const similarity = sql<number>`1 - (${cosineDistance(knowledgeEmbeddings.embedding, queryEmbedding)})`

  const agentScopeFilter = agentId
    ? sql`${knowledgeEmbeddings.articleId} IN (
        SELECT ak.article_id FROM agent_knowledge ak WHERE ak.agent_id = ${agentId}
      )`
    : undefined

  const vectorRowsPromise = db
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
    .where(agentScopeFilter)
    .orderBy(desc(similarity))
    .limit(candidateLimit)

  // BM25 via Postgres full-text search — only when tsvector is populated
  const bm25RowsPromise = tsQuery
    ? db
        .select({
          articleId: knowledgeEmbeddings.articleId,
          chunkIndex: knowledgeEmbeddings.chunkIndex,
          content: knowledgeEmbeddings.content,
          score: sql<number>`ts_rank_cd(${knowledgeEmbeddings.contentTsv}, to_tsquery('portuguese', ${tsQuery}))`,
          title: knowledgeBase.title,
          source: knowledgeBase.source,
          author: knowledgeBase.author,
          category: knowledgeBase.category,
          isVerified: knowledgeBase.isVerified,
        })
        .from(knowledgeEmbeddings)
        .innerJoin(knowledgeBase, eq(knowledgeEmbeddings.articleId, knowledgeBase.id))
        .where(
          and(
            sql`${knowledgeEmbeddings.contentTsv} @@ to_tsquery('portuguese', ${tsQuery})`,
            agentScopeFilter,
          ),
        )
        .orderBy(
          desc(
            sql`ts_rank_cd(${knowledgeEmbeddings.contentTsv}, to_tsquery('portuguese', ${tsQuery}))`,
          ),
        )
        .limit(candidateLimit)
    : Promise.resolve([])

  const [vectorRows, bm25Rows] = await Promise.all([vectorRowsPromise, bm25RowsPromise])

  const fusedRows = reciprocalRankFusion(vectorRows as SearchRow[], bm25Rows as SearchRow[])
  const dedupedRows = dedupeRowsByArticle(fusedRows, topK)

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
