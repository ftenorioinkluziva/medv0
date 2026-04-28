import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { getAllAgentsForAdmin } from '@/lib/db/queries/health-agents'
import { Pagination } from '@/components/ui/pagination'

const AgentsTable = dynamic(
  () => import('./_components/agents-table').then((module) => module.AgentsTable),
  {
    loading: () => <div className="rounded-md border p-4 text-sm text-muted-foreground">Carregando agentes...</div>,
  },
)

const PAGE_SIZE = 20

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const params = await searchParams
  const rawPage = Math.trunc(Number(params.page))
  const rawSize = Math.trunc(Number(params.size))
  const page = Math.max(1, Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1)
  const size = Math.max(1, Math.min(100, Number.isFinite(rawSize) && rawSize > 0 ? rawSize : PAGE_SIZE))
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
