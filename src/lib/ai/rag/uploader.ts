import { embedMany } from 'ai'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { knowledgeBase, knowledgeEmbeddings } from '@/lib/db/schema'
import { chunkText } from './chunker'
import {
  getKnowledgeEmbeddingModel,
  getKnowledgeEmbeddingProviderOptions,
} from './embedding-model'

export interface UpsertArticleInput {
  title: string
  content: string
  summary?: string
  source?: string
  author?: string
  publishedDate?: string // ISO date string e.g. '2024-01-15'
  category?: string
  subcategory?: string
  tags?: string[]
  language: string
}

export interface UpsertArticleResult {
  articleId: string
  chunksCreated: number
  action: 'created' | 'updated'
}

export async function upsertKnowledgeArticle(
  input: UpsertArticleInput,
): Promise<UpsertArticleResult> {
  const chunks = chunkText(input.content)

  const { embeddings } = await embedMany({
    model: getKnowledgeEmbeddingModel(),
    values: chunks,
    providerOptions: getKnowledgeEmbeddingProviderOptions('RETRIEVAL_DOCUMENT'),
  })

  const existing = await db
    .select({ id: knowledgeBase.id })
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.title, input.title),
        input.source != null
          ? eq(knowledgeBase.source, input.source)
          : isNull(knowledgeBase.source),
      ),
    )
    .limit(1)

  const articleFields = {
    title: input.title,
    content: input.content,
    summary: input.summary ?? null,
    source: input.source ?? null,
    author: input.author ?? null,
    publishedDate: input.publishedDate ?? null,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    tags: input.tags ?? null,
    language: input.language,
  }

  let articleId: string
  let action: 'created' | 'updated'

  if (existing.length > 0) {
    articleId = existing[0].id
    action = 'updated'
    await db
      .update(knowledgeBase)
      .set({ ...articleFields, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, articleId))
    await db.delete(knowledgeEmbeddings).where(eq(knowledgeEmbeddings.articleId, articleId))
  } else {
    const [inserted] = await db
      .insert(knowledgeBase)
      .values(articleFields)
      .returning({ id: knowledgeBase.id })
    articleId = inserted.id
    action = 'created'
  }

  await db.insert(knowledgeEmbeddings).values(
    chunks.map((content, i) => ({
      articleId,
      chunkIndex: i,
      content,
      embedding: embeddings[i],
    })),
  )

  return { articleId: articleId!, chunksCreated: chunks.length, action: action! }
}
