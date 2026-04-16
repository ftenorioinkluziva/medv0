'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { chatSessions } from '@/lib/db/schema'
import { auth } from '@/lib/auth/config'
import { sql } from 'drizzle-orm'

export async function startChat(agentId: string): Promise<never> {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const userId = session.user.id

  const [chatSession] = await db
    .insert(chatSessions)
    .values({ userId, agentId, title: 'Nova conversa' })
    .onConflictDoUpdate({
      target: [chatSessions.userId, chatSessions.agentId],
      set: { updatedAt: sql`now()` },
    })
    .returning({ id: chatSessions.id })

  redirect(`/app/chat/${chatSession.id}`)
}
