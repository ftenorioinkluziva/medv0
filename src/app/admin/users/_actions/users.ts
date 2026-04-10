'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { requireAdmin, UnauthorizedError } from '@/lib/auth/require-admin'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { getUserById } from '@/lib/db/queries/users'

type ActionResult = { error: string } | { success: true }

export async function toggleUserActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  let session: Awaited<ReturnType<typeof requireAdmin>>
  try {
    session = await requireAdmin()
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: 'Unauthorized' }
    throw error
  }

  if (session.user.id === id) {
    return { error: 'Não é possível desativar a própria conta.' }
  }

  const user = await getUserById(id)
  if (!user) return { error: 'Usuário não encontrado' }

  try {
    await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id))
  } catch {
    return { error: 'Erro ao atualizar usuário. Tente novamente.' }
  }

  revalidatePath('/admin/users')
  return { success: true }
}
