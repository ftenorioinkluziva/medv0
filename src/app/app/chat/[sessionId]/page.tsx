import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getChatMessages, getSessionWithAgent } from '@/lib/db/queries/chat'
import { ChatInterface } from './chat-interface'

interface ChatSessionPageProps {
  params: Promise<{ sessionId: string }>
}

export default async function ChatSessionPage({ params }: ChatSessionPageProps) {
  const [session, { sessionId }] = await Promise.all([auth(), params])

  if (!session?.user?.id) redirect('/auth/login')

  const [chatSession, history] = await Promise.all([
    getSessionWithAgent(sessionId),
    getChatMessages(sessionId, 50),
  ])

  if (!chatSession || chatSession.userId !== session.user.id) {
    notFound()
  }

  const initialMessages = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  return (
    <ChatInterface
      sessionId={sessionId}
      agentId={chatSession.agentId}
      agentName={chatSession.agent.name}
      agentSpecialty={chatSession.agent.specialty}
      initialMessages={initialMessages}
    />
  )
}
