import Link from 'next/link'
import dynamic from 'next/dynamic'

const AgentForm = dynamic(
  () => import('../_components/agent-form').then((module) => module.AgentForm),
  {
    loading: () => (
      <div className="max-w-2xl rounded-md border p-4 text-sm text-muted-foreground">Carregando formulário...</div>
    ),
  },
)

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
