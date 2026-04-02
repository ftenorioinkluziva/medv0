import { ilike, or, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { knowledgeBase, type KnowledgeBase } from '@/lib/db/schema'

export async function getAllArticlesForAdmin(): Promise<KnowledgeBase[]> {
  return db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt))
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
