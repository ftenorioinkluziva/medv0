import { embedMany } from 'ai'
import { Client } from 'pg'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { knowledgeBase, knowledgeEmbeddings } from '@/lib/db/schema'
import { chunkText } from '@/lib/ai/rag/chunker'
import {
  getKnowledgeEmbeddingModel,
  getKnowledgeEmbeddingProviderOptions,
} from '@/lib/ai/rag/embedding-model'

export interface LegacyKnowledgeArticle {
  id: string
  title: string
  category: string
  subcategory: string | null
  content: string
  summary: string | null
  source: string | null
  source_url: string | null
  author: string | null
  published_date: Date | null
  tags: unknown
  language: string
  relevance_score: number | null
  is_verified: string
  usage_count: number
  created_at: Date
  updated_at: Date
  last_analyzed_at: Date | null
  analysis_version: string | null
}

export interface LegacyImportOptions {
  legacyDatabaseUrl: string
  dryRun?: boolean
  limit?: number
  offset?: number
  author?: string
}

export interface LegacyImportSummary {
  totalRead: number
  created: number
  updated: number
  failed: number
  failures: Array<{ articleId: string; title: string; error: string }>
}

export function normalizeLegacyTags(tags: unknown): string[] | null {
  if (tags == null) {
    return null
  }

  if (Array.isArray(tags)) {
    const normalized = tags
      .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
      .filter((tag) => tag.length > 0)
    return normalized.length > 0 ? normalized : null
  }

  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags)
      return normalizeLegacyTags(parsed)
    } catch {
      const normalized = tags.trim()
      return normalized ? [normalized] : null
    }
  }

  return null
}

export function normalizeLegacyPublishedDate(value: Date | string | null): string | null {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}

export function mapLegacyArticle(article: LegacyKnowledgeArticle) {
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    summary: article.summary,
    source: article.source,
    author: article.author,
    publishedDate: normalizeLegacyPublishedDate(article.published_date),
    category: article.category,
    subcategory: article.subcategory,
    tags: normalizeLegacyTags(article.tags),
    language: article.language,
    isVerified: article.is_verified,
    usageCount: article.usage_count,
    lastAnalyzedAt: article.last_analyzed_at,
    analysisVersion: article.analysis_version,
    createdAt: article.created_at,
    updatedAt: article.updated_at,
  }
}

async function fetchLegacyArticles(options: LegacyImportOptions): Promise<LegacyKnowledgeArticle[]> {
  const client = new Client({ connectionString: options.legacyDatabaseUrl })
  await client.connect()

  try {
    const whereClause = options.author ? 'where author = $1' : ''
    const params: Array<string | number> = []

    if (options.author) {
      params.push(options.author)
    }

    let limitClause = ''
    if (options.limit != null) {
      const limitIndex = params.length + 1
      const offsetIndex = params.length + 2
      limitClause = `limit $${limitIndex} offset $${offsetIndex}`
      params.push(options.limit, options.offset ?? 0)
    }

    const query = `
      select
        id,
        title,
        category,
        subcategory,
        content,
        summary,
        source,
        source_url,
        author,
        published_date,
        tags,
        language,
        relevance_score,
        is_verified,
        usage_count,
        created_at,
        updated_at,
        last_analyzed_at,
        analysis_version
      from public.knowledge_articles
      ${whereClause}
      order by created_at asc, id asc
      ${limitClause}
    `

    const result = await client.query<LegacyKnowledgeArticle>(query, params)
    return result.rows
  } finally {
    await client.end()
  }
}

async function upsertMappedArticle(mapped: ReturnType<typeof mapLegacyArticle>) {
  const chunks = chunkText(mapped.content)
  const { embeddings } = await embedMany({
    model: getKnowledgeEmbeddingModel(),
    values: chunks,
    providerOptions: getKnowledgeEmbeddingProviderOptions('RETRIEVAL_DOCUMENT'),
  })

  const existing = await db
    .select({ id: knowledgeBase.id })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.id, mapped.id))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(knowledgeBase)
      .set({
        title: mapped.title,
        content: mapped.content,
        summary: mapped.summary,
        source: mapped.source,
        author: mapped.author,
        publishedDate: mapped.publishedDate,
        category: mapped.category,
        subcategory: mapped.subcategory,
        tags: mapped.tags,
        language: mapped.language,
        isVerified: mapped.isVerified,
        usageCount: mapped.usageCount,
        lastAnalyzedAt: mapped.lastAnalyzedAt,
        analysisVersion: mapped.analysisVersion,
        updatedAt: mapped.updatedAt,
      })
      .where(eq(knowledgeBase.id, mapped.id))

    await db.delete(knowledgeEmbeddings).where(eq(knowledgeEmbeddings.articleId, mapped.id))
  } else {
    await db.insert(knowledgeBase).values({
      id: mapped.id,
      title: mapped.title,
      content: mapped.content,
      summary: mapped.summary,
      source: mapped.source,
      author: mapped.author,
      publishedDate: mapped.publishedDate,
      category: mapped.category,
      subcategory: mapped.subcategory,
      tags: mapped.tags,
      language: mapped.language,
      isVerified: mapped.isVerified,
      usageCount: mapped.usageCount,
      lastAnalyzedAt: mapped.lastAnalyzedAt,
      analysisVersion: mapped.analysisVersion,
      createdAt: mapped.createdAt,
      updatedAt: mapped.updatedAt,
    })
  }

  if (chunks.length > 0) {
    await db.insert(knowledgeEmbeddings).values(
      chunks.map((content, index) => ({
        articleId: mapped.id,
        chunkIndex: index,
        content,
        embedding: embeddings[index],
        createdAt: new Date(),
      })),
    )
  }

  return existing.length > 0 ? 'updated' : 'created'
}

export async function importLegacyKnowledge(
  options: LegacyImportOptions,
): Promise<LegacyImportSummary> {
  const articles = await fetchLegacyArticles(options)
  const summary: LegacyImportSummary = {
    totalRead: articles.length,
    created: 0,
    updated: 0,
    failed: 0,
    failures: [],
  }

  for (const article of articles) {
    const mapped = mapLegacyArticle(article)

    if (options.dryRun) {
      continue
    }

    try {
      const action = await upsertMappedArticle(mapped)
      if (action === 'created') {
        summary.created += 1
      } else {
        summary.updated += 1
      }
    } catch (error) {
      summary.failed += 1
      summary.failures.push({
        articleId: article.id,
        title: article.title,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return summary
}
