import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { AdminNav } from './_components/admin-nav'

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
