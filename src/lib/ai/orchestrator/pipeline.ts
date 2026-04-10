import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { medicalProfiles } from '@/lib/db/schema'

export interface AgentOutput {
  agentId: string
  agentName: string
  role: string
  content: string
  status: 'completed' | 'timeout' | 'error'
}

export function readTimeoutMs(envName: string, fallbackMs: number): number {
  const rawValue = process.env[envName]
  if (!rawValue) return fallbackMs

  const parsed = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsed) || parsed <= 0) return fallbackMs

  return parsed
}

export async function buildMedicalProfileContext(userId: string): Promise<string> {
  const [profile] = await db
    .select()
    .from(medicalProfiles)
    .where(eq(medicalProfiles.userId, userId))
    .limit(1)

  if (!profile) return '{}'

  return JSON.stringify({
    age: profile.age,
    gender: profile.gender,
    height: profile.height,
    weight: profile.weight,
    systolicPressure: profile.systolicPressure,
    diastolicPressure: profile.diastolicPressure,
    restingHeartRate: profile.restingHeartRate,
    healthObjectives: profile.healthObjectives,
    medicalConditions: profile.medicalConditions,
  })
}
