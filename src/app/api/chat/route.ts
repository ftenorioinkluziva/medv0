import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { z } from 'zod'
import { and, count, eq, gte } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { chatMessages, chatSessions, healthAgents, livingAnalyses, medicalProfiles } from '@/lib/db/schema'
import { getChatMessages, getSessionWithAgent } from '@/lib/db/queries/chat'
import { searchKnowledge } from '@/lib/ai/rag/vector-search'
import { resolveModel } from '@/lib/ai/core/resolve-model'
import { buildChatSystemPrompt } from './helpers'
import { classifyIntent } from './intent'
import { buildPatientContext } from './patient-context'

export const maxDuration = 60

const ChatSchema = z.object({
  sessionId: z.string().uuid().nullable(),
  agentId: z.string().uuid(),
  message: z.string().min(1).max(4000),
})

const RATE_LIMIT_MESSAGES = 30
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

async function checkRateLimit(userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
  const [result] = await db
    .select({ msgCount: count() })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatSessions.userId, userId),
        eq(chatMessages.role, 'user'),
        gte(chatMessages.createdAt, oneHourAgo),
      ),
    )
  return result.msgCount < RATE_LIMIT_MESSAGES
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const userId = session.user.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const parsed = ChatSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validação falhou.', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { sessionId, agentId, message } = parsed.data

  const withinLimit = await checkRateLimit(userId)
  if (!withinLimit) {
    return Response.json(
      { error: 'Limite de mensagens atingido. Tente novamente em breve.' },
      { status: 429 },
    )
  }

  const [agent] = await db
    .select()
    .from(healthAgents)
    .where(and(eq(healthAgents.id, agentId), eq(healthAgents.isActive, true)))
    .limit(1)

  if (!agent) {
    return Response.json({ error: 'Agente não encontrado.' }, { status: 404 })
  }

  let activeSessionId: string

  if (sessionId === null) {
    const title = message.slice(0, 50)
    const [newSession] = await db
      .insert(chatSessions)
      .values({ userId, agentId, title })
      .returning({ id: chatSessions.id })
    activeSessionId = newSession.id
  } else {
    const sessionRecord = await getSessionWithAgent(sessionId)
    if (!sessionRecord || sessionRecord.userId !== userId) {
      return Response.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    }
    activeSessionId = sessionId
  }

  await db.insert(chatMessages).values({
    sessionId: activeSessionId,
    role: 'user',
    content: message,
  })

  const blocks = classifyIntent(message)
  const needsAnalysis = blocks.has('living_analysis')

  const [chatHistory, ragChunks, profile, analysisRow] = await Promise.all([
    getChatMessages(activeSessionId, 20),
    searchKnowledge(message, 3, agentId),
    db
      .select()
      .from(medicalProfiles)
      .where(eq(medicalProfiles.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    needsAnalysis
      ? db
          .select({ reportMarkdown: livingAnalyses.reportMarkdown })
          .from(livingAnalyses)
          .where(eq(livingAnalyses.userId, userId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ])

  const knowledgeContext = ragChunks
    .map((chunk) => `### ${chunk.article.title}\n${chunk.content}`)
    .join('\n\n')

  const patientContext = buildPatientContext({
    profile,
    livingAnalysisReport: analysisRow?.reportMarkdown ?? null,
    blocks,
  })

  const systemPrompt = buildChatSystemPrompt(agent.chatPrompt ?? agent.systemPrompt, patientContext, knowledgeContext)

  const messages = chatHistory.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const result = streamText({
    model: resolveModel(agent.model),
    system: systemPrompt,
    messages,
    temperature: Number(agent.temperature),
    onFinish: async ({ text, usage }) => {
      try {
        await Promise.all([
          db.insert(chatMessages).values({
            sessionId: activeSessionId,
            role: 'assistant',
            content: text,
            tokensUsed: usage?.totalTokens ?? null,
          }),
          db
            .update(chatSessions)
            .set({ updatedAt: new Date() })
            .where(eq(chatSessions.id, activeSessionId)),
        ])
      } catch (error) {
        console.error('[chat/onFinish] failed to persist assistant message', {
          sessionId: activeSessionId,
          error,
        })
      }
    },
  })

  return result.toTextStreamResponse()
}
