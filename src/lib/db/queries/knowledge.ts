import { count, ilike, or, desc, eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { knowledgeBase, type KnowledgeBase } from '@/lib/db/schema'
import type { PaginatedResult } from './users'

export async function getAllArticlesForAdmin(
  limit: number = 50,
  offset: number = 0,
): Promise<PaginatedResult<KnowledgeBase>> {
  const [rows, totalResult] = await Promise.all([
    db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt), asc(knowledgeBase.id)).limit(limit).offset(offset),
    db.select({ count: count() }).from(knowledgeBase),
  ])

  return { data: rows, total: totalResult[0]?.count ?? 0 }
}

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&')
}

export async function searchArticles(query: string): Promise<KnowledgeBase[]> {
  const escaped = escapeLikePattern(query)
  return db
    .select()
    .from(knowledgeBase)
    .where(
      or(
        ilike(knowledgeBase.title, `%${escaped}%`),
        ilike(knowledgeBase.category, `%${escaped}%`),
      ),
    )
    .orderBy(desc(knowledgeBase.createdAt))
}

export async function getArticleById(id: string): Promise<KnowledgeBase | undefined> {
  const results = await db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.id, id))
    .limit(1)
  return results[0]
}
