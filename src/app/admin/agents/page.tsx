import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAllAgentsForAdmin } from '@/lib/db/queries/health-agents'
import { AgentsTable } from './_components/agents-table'
import { Pagination } from '@/components/ui/pagination'

const PAGE_SIZE = 20

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const size = Math.max(1, Math.min(100, Number(params.size) || PAGE_SIZE))
  const offset = (page - 1) * size

  const { data: agents, total } = await getAllAgentsForAdmin(size, offset)
  const totalPages = Math.ceil(total / size)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Agentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os agentes de IA do sistema
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/agents/new" />}>
          Novo Agente
        </Button>
      </div>
      <AgentsTable agents={agents} />
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  )
}
