import { auth } from '@/lib/auth/config'

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  return session
}
