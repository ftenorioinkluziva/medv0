import { eq, asc, and, count } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { healthAgents, type HealthAgent } from '@/lib/db/schema'
import type { PaginatedResult } from './users'

export async function getActiveAgentsByRole(
  role: 'foundation' | 'specialized' | 'none',
): Promise<HealthAgent[]> {
  return db
    .select()
    .from(healthAgents)
    .where(and(eq(healthAgents.isActive, true), eq(healthAgents.analysisRole, role)))
    .orderBy(asc(healthAgents.sortOrder))
}

export async function getAllActiveAgents(): Promise<HealthAgent[]> {
  return db
    .select()
    .from(healthAgents)
    .where(eq(healthAgents.isActive, true))
    .orderBy(asc(healthAgents.sortOrder))
}

export async function getAllAgentsForAdmin(
  limit: number = 50,
  offset: number = 0,
): Promise<PaginatedResult<HealthAgent>> {
  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(healthAgents)
      .orderBy(asc(healthAgents.analysisRole), asc(healthAgents.sortOrder))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(healthAgents),
  ])

  return { data: rows, total: totalResult[0]?.count ?? 0 }
}

export async function getAgentById(id: string): Promise<HealthAgent | undefined> {
  const results = await db
    .select()
    .from(healthAgents)
    .where(eq(healthAgents.id, id))
    .limit(1)
  return results[0]
}

export async function countActiveFoundationAgents(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(healthAgents)
    .where(and(eq(healthAgents.isActive, true), eq(healthAgents.analysisRole, 'foundation')))
  return result[0]?.count ?? 0
}
