import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAgentById } from '@/lib/db/queries/health-agents'
import { AgentForm } from '../../_components/agent-form'

interface EditAgentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const { id } = await params
  const agent = await getAgentById(id)

  if (!agent) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/agents"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar para Agentes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Editar Agente</h1>
        <p className="mt-1 text-sm text-muted-foreground">{agent.name}</p>
      </div>
      <AgentForm agent={agent} />
    </div>
  )
}
