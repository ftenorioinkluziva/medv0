import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { chatSessions, chatMessages, healthAgents } from '@/lib/db/schema'
import type { ChatSession, ChatMessage } from '@/lib/db/schema'
import type { HealthAgent } from '@/lib/db/schema'

export type ChatSessionWithAgent = ChatSession & { agent: Pick<HealthAgent, 'id' | 'name' | 'specialty'> }

export async function getChatSessionsByUser(userId: string): Promise<ChatSession[]> {
  return db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))
}

export async function getChatSessionsWithAgent(userId: string): Promise<ChatSessionWithAgent[]> {
  const rows = await db
    .select({
      id: chatSessions.id,
      userId: chatSessions.userId,
      agentId: chatSessions.agentId,
      analysisId: chatSessions.analysisId,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
      agentName: healthAgents.name,
      agentSpecialty: healthAgents.specialty,
    })
    .from(chatSessions)
    .innerJoin(healthAgents, eq(chatSessions.agentId, healthAgents.id))
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(20)

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    agentId: r.agentId,
    analysisId: r.analysisId,
    title: r.title,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    agent: { id: r.agentId, name: r.agentName, specialty: r.agentSpecialty },
  }))
}

export async function getLatestSessionByAgent(
  userId: string,
  agentId: string,
): Promise<ChatSession | null> {
  const [row] = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.userId, userId), eq(chatSessions.agentId, agentId)))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(1)
  return row ?? null
}

export async function getChatMessages(sessionId: string, limit: number = 20): Promise<ChatMessage[]> {
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)

  return messages.reverse()
}

export async function getSessionWithAgent(
  sessionId: string,
): Promise<(ChatSession & { agent: HealthAgent }) | null> {
  const [result] = await db
    .select({
      id: chatSessions.id,
      userId: chatSessions.userId,
      agentId: chatSessions.agentId,
      analysisId: chatSessions.analysisId,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
      agent: healthAgents,
    })
    .from(chatSessions)
    .innerJoin(healthAgents, eq(chatSessions.agentId, healthAgents.id))
    .where(eq(chatSessions.id, sessionId))
    .limit(1)

  if (!result) return null

  return {
    id: result.id,
    userId: result.userId,
    agentId: result.agentId,
    analysisId: result.analysisId,
    title: result.title,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    agent: result.agent,
  }
}
