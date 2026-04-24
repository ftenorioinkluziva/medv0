import { redirect } from 'next/navigation'
import { and, asc, eq, isNotNull } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { healthAgents } from '@/lib/db/schema'
import { getChatSessionsWithAgent } from '@/lib/db/queries/chat'
import { AgentCard } from './agent-card'
import { SessionList } from './session-list'

export default async function ChatPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const [agents, sessions] = await Promise.all([
    db
      .select({
        id: healthAgents.id,
        name: healthAgents.name,
        specialty: healthAgents.specialty,
        description: healthAgents.description,
      })
      .from(healthAgents)
      .where(and(eq(healthAgents.isActive, true), isNotNull(healthAgents.chatPrompt)))
      .orderBy(asc(healthAgents.sortOrder), asc(healthAgents.name)),
    getChatSessionsWithAgent(session.user.id),
  ])

  return (
    <main className="min-h-screen bg-background">
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Conversar com agente</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Selecione um especialista</p>
        </div>

        <div className="space-y-2">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
          {agents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum agente disponível no momento.
            </p>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Conversas anteriores
            </h2>
            <SessionList sessions={sessions} />
          </div>
        )}
      </div>
    </main>
  )
}
