import bcryptjs from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'

export type AuthUser = {
  id: string
  email: string
  role: string
  onboardingCompleted: boolean
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user || !user.isActive) return null

  const valid = await bcryptjs.compare(password, user.passwordHash)
  if (!valid) return null

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted,
  }
}
