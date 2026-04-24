import dynamic from 'next/dynamic'
import { getAllUsersForAdmin } from '@/lib/db/queries/users'
import { Pagination } from '@/components/ui/pagination'

const UsersTable = dynamic(
  () => import('./_components/users-table').then((module) => module.UsersTable),
  {
    loading: () => <div className="rounded-md border p-4 text-sm text-muted-foreground">Carregando usuários...</div>,
  },
)

const PAGE_SIZE = 20

export default async function AdminUsersPage({
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

  const { data: users, total } = await getAllUsersForAdmin(size, offset)
  const totalPages = Math.ceil(total / size)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
          </p>
        </div>
      </div>
      <UsersTable users={users} />
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  )
}
