import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { auth } from '@/lib/auth/config'

const AdminNav = dynamic(
  () => import('./_components/admin-nav').then((module) => module.AdminNav),
  {
    loading: () => <aside className="hidden md:block w-56 min-h-screen border-r bg-background" />,
  },
)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/login?callbackUrl=/admin')
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <AdminNav adminName={session.user.name ?? session.user.email} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
