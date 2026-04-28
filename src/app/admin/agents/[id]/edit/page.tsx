import Link from 'next/link'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { getAgentById } from '@/lib/db/queries/health-agents'
import { getArticlesByAgent, getAllArticlesForSelector } from '@/lib/db/queries/knowledge'

const AgentForm = dynamic(
  () => import('../../_components/agent-form').then((module) => module.AgentForm),
  {
    loading: () => (
      <div className="max-w-2xl rounded-md border p-4 text-sm text-muted-foreground">Carregando formulário...</div>
    ),
  },
)

const AgentKnowledgeSection = dynamic(
  () => import('../../_components/agent-knowledge-section').then((module) => module.AgentKnowledgeSection),
  {
    loading: () => (
      <div className="mt-6 rounded-md border p-4 text-sm text-muted-foreground">Carregando associação com artigos...</div>
    ),
  },
)

interface EditAgentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const { id } = await params

  const [agent, associatedArticles, allArticles] = await Promise.all([
    getAgentById(id),
    getArticlesByAgent(id),
    getAllArticlesForSelector(),
  ])

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
      <hr className="mt-10 border-border" />
      <AgentKnowledgeSection
        agentId={id}
        initialAssociatedIds={associatedArticles.map((a) => a.id)}
        allArticles={allArticles}
      />
    </div>
  )
}
