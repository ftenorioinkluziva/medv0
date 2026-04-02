import { getAllUsersForAdmin } from '@/lib/db/queries/users'
import { UsersTable } from './_components/users-table'

export default async function AdminUsersPage() {
  const users = await getAllUsersForAdmin()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
          </p>
        </div>
      </div>
      <UsersTable users={users} />
    </div>
  )
}
