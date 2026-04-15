'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { agentKnowledge, knowledgeBase } from '@/lib/db/schema'
import { requireAdmin, UnauthorizedError } from '@/lib/auth/require-admin'

type ActionResult = { error: string } | { success: true }

export async function associateArticlesAction(
  agentId: string,
  articleIds: string[],
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: 'Unauthorized' }
    throw error
  }

  if (articleIds.length === 0) return { success: true }

  await db
    .insert(agentKnowledge)
    .values(articleIds.map((articleId) => ({ agentId, articleId })))
    .onConflictDoNothing()

  revalidatePath(`/admin/agents/${agentId}/edit`)
  return { success: true }
}

export async function disassociateArticlesAction(
  agentId: string,
  articleIds: string[],
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: 'Unauthorized' }
    throw error
  }

  if (articleIds.length === 0) return { success: true }

  await db
    .delete(agentKnowledge)
    .where(
      and(
        eq(agentKnowledge.agentId, agentId),
        inArray(agentKnowledge.articleId, articleIds),
      ),
    )

  revalidatePath(`/admin/agents/${agentId}/edit`)
  return { success: true }
}

export async function toggleArticleGlobalAction(
  articleId: string,
  isGlobal: boolean,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: 'Unauthorized' }
    throw error
  }

  const updated = await db
    .update(knowledgeBase)
    .set({ isGlobal, updatedAt: new Date() })
    .where(eq(knowledgeBase.id, articleId))
    .returning({ id: knowledgeBase.id })

  if (updated.length === 0) {
    console.warn(`toggleArticleGlobalAction: article ${articleId} not found`)
    return { error: 'Article not found' }
  }

  revalidatePath('/admin/knowledge')
  return { success: true }
}
