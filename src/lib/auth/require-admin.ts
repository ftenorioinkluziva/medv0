import { auth } from '@/lib/auth/config'

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    throw new UnauthorizedError()
  }
  return session
}
