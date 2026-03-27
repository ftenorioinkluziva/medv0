import { embed } from 'ai'
import { google } from '@ai-sdk/google'
import { cosineDistance, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { knowledgeBase, knowledgeEmbeddings } from '@/lib/db/schema'

export interface KnowledgeChunk {
  articleId: string
  chunkIndex: number
  content: string
  score: number
  article: {
    title: string
    source: string | null
    author: string | null
    category: string | null
    isVerified: string
  }
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel('text-embedding-004'),
    value: query,
  })
  return embedding
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
    .limit(topK)

  return rows.map((r) => ({
    articleId: r.articleId,
    chunkIndex: r.chunkIndex,
    content: r.content,
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
