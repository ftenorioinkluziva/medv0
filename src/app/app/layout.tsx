import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth/config'
import { BottomNav } from './dashboard/components/bottom-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <SessionProvider session={session}>
      <div className="relative min-h-screen pb-16">
        {children}
        <BottomNav />
      </div>
    </SessionProvider>
  )
}
