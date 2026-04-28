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
      <div className="flex flex-col gap-6 px-4 pt-12 pb-20">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-[20px] font-medium leading-[1.4286] text-foreground">
            Conversar com agente
          </h1>
          <p className="text-[12px] font-medium text-muted-foreground">Selecione um especialista</p>
        </div>

        <div className="flex flex-col gap-2">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
          {agents.length === 0 && (
            <p className="text-[13px] font-medium text-muted-foreground text-center py-8">
              Nenhum agente disponível no momento.
            </p>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              CONVERSAS ANTERIORES
            </p>
            <SessionList sessions={sessions} />
          </div>
        )}
      </div>
    </main>
  )
}
