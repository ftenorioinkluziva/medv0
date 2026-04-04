import { count, eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users, documents, livingAnalyses, type User } from '@/lib/db/schema'

export type UserForAdmin = {
  id: string
  email: string
  role: 'patient' | 'admin'
  isActive: boolean
  onboardingCompleted: boolean
  createdAt: Date
  documentsCount: number
  analysesCount: number
}

export async function getAllUsersForAdmin(): Promise<UserForAdmin[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      onboardingCompleted: users.onboardingCompleted,
      createdAt: users.createdAt,
      documentsCount: count(documents.id),
      analysesCount: count(livingAnalyses.id),
    })
    .from(users)
    .leftJoin(documents, eq(documents.userId, users.id))
    .leftJoin(livingAnalyses, eq(livingAnalyses.userId, users.id))
    .groupBy(
      users.id,
      users.email,
      users.role,
      users.isActive,
      users.onboardingCompleted,
      users.createdAt,
    )
    .orderBy(desc(users.createdAt))

  return rows
}

export async function getUserById(id: string): Promise<User | undefined> {
  const results = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return results[0]
}
