import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth/config'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return <SessionProvider session={session}>{children}</SessionProvider>
}
