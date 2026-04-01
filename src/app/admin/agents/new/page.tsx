import Link from 'next/link'
import { AgentForm } from '../_components/agent-form'

export default function NewAgentPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/agents"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar para Agentes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Novo Agente</h1>
      </div>
      <AgentForm />
    </div>
  )
}
