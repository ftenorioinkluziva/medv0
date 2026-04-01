import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAllAgentsForAdmin } from '@/lib/db/queries/health-agents'
import { AgentsTable } from './_components/agents-table'

export default async function AdminAgentsPage() {
  const agents = await getAllAgentsForAdmin()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Agentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os agentes de IA do sistema
          </p>
        </div>
        <Button render={<Link href="/admin/agents/new" />}>Novo Agente</Button>
      </div>
      <AgentsTable agents={agents} />
    </div>
  )
}
