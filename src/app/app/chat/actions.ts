'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { chatSessions } from '@/lib/db/schema'
import { auth } from '@/lib/auth/config'
import { getLatestSessionByAgent } from '@/lib/db/queries/chat'

export async function startChat(agentId: string): Promise<never> {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const userId = session.user.id

  const existing = await getLatestSessionByAgent(userId, agentId)
  if (existing) {
    redirect(`/app/chat/${existing.id}`)
  }

  const [newSession] = await db
    .insert(chatSessions)
    .values({ userId, agentId, title: 'Nova conversa' })
    .returning({ id: chatSessions.id })

  redirect(`/app/chat/${newSession.id}`)
}
