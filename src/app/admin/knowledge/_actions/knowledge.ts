'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { knowledgeBase } from '@/lib/db/schema'
import { getArticleById } from '@/lib/db/queries/knowledge'

type ActionResult = { error: string } | { success: true }

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  const article = await getArticleById(id)
  if (!article) return { error: 'Artigo não encontrado' }

  try {
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id))
  } catch {
    return { error: 'Erro ao remover artigo. Tente novamente.' }
  }

  revalidatePath('/admin/knowledge')
  return { success: true }
}
