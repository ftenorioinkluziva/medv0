import { and, count, ilike, or, desc, eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { agentKnowledge, healthAgents, knowledgeBase, type HealthAgent, type KnowledgeBase } from '@/lib/db/schema'
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

export async function getArticlesByAgent(agentId: string): Promise<KnowledgeBase[]> {
  const rows = await db
    .select({ article: knowledgeBase })
    .from(agentKnowledge)
    .innerJoin(knowledgeBase, eq(agentKnowledge.articleId, knowledgeBase.id))
    .where(eq(agentKnowledge.agentId, agentId))
  return rows.map((r) => r.article)
}

export async function associateArticleToAgent(agentId: string, articleId: string): Promise<void> {
  await db.insert(agentKnowledge).values({ agentId, articleId })
}

export async function disassociateArticleFromAgent(agentId: string, articleId: string): Promise<void> {
  await db
    .delete(agentKnowledge)
    .where(and(eq(agentKnowledge.agentId, agentId), eq(agentKnowledge.articleId, articleId)))
}

export async function getAgentsByArticle(articleId: string): Promise<HealthAgent[]> {
  const rows = await db
    .select({ agent: healthAgents })
    .from(agentKnowledge)
    .innerJoin(healthAgents, eq(agentKnowledge.agentId, healthAgents.id))
    .where(eq(agentKnowledge.articleId, articleId))
  return rows.map((r) => r.agent)
}
