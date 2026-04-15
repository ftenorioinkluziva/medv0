import { count, eq, desc, asc, sql } from 'drizzle-orm'
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

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

export async function getAllUsersForAdmin(
  limit: number = 50,
  offset: number = 0,
): Promise<PaginatedResult<UserForAdmin>> {
  const docsCount = db
    .select({ userId: documents.userId, cnt: count().as('docs_cnt') })
    .from(documents)
    .groupBy(documents.userId)
    .as('docs_count')

  const analysesCount = db
    .select({ userId: livingAnalyses.userId, cnt: count().as('analyses_cnt') })
    .from(livingAnalyses)
    .groupBy(livingAnalyses.userId)
    .as('analyses_count')

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
        documentsCount: sql<number>`coalesce(${docsCount.cnt}, 0)`,
        analysesCount: sql<number>`coalesce(${analysesCount.cnt}, 0)`,
      })
      .from(users)
      .leftJoin(docsCount, eq(docsCount.userId, users.id))
      .leftJoin(analysesCount, eq(analysesCount.userId, users.id))
      .orderBy(desc(users.createdAt), asc(users.id))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(users),
  ])

  return { data: rows, total: totalResult[0]?.count ?? 0 }
}

export async function getUserById(id: string): Promise<User | undefined> {
  const results = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return results[0]
}
