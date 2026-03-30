import { eq, asc, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { healthAgents, type HealthAgent } from '@/lib/db/schema'

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
