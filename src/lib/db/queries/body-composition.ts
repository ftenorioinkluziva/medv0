import { desc, eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { bodyCompositionHistory } from '@/lib/db/schema'
import type { BodyCompositionHistoryRecord } from '@/lib/db/schema'

export type { BodyCompositionHistoryRecord }

export type BodyCompositionDelta = {
  weight: string | null
  bodyFat: string | null
  muscleMass: string | null
  visceralFat: string | null
  boneMass: string | null
  bodyWater: string | null
}

export type LatestBodyCompositionResult = {
  latest: BodyCompositionHistoryRecord | null
  previous: BodyCompositionHistoryRecord | null
  delta: BodyCompositionDelta | null
}

export async function getBodyCompositionHistory(
  userId: string,
  limit: number = 10,
): Promise<BodyCompositionHistoryRecord[]> {
  return db
    .select()
    .from(bodyCompositionHistory)
    .where(eq(bodyCompositionHistory.userId, userId))
    .orderBy(desc(bodyCompositionHistory.measuredAt))
    .limit(limit)
}

export async function getLatestBodyComposition(
  userId: string,
): Promise<LatestBodyCompositionResult> {
  const records = await db
    .select()
    .from(bodyCompositionHistory)
    .where(eq(bodyCompositionHistory.userId, userId))
    .orderBy(desc(bodyCompositionHistory.measuredAt))
    .limit(2)

  const latest = records[0] ?? null
  const previous = records[1] ?? null

  if (!latest) return { latest: null, previous: null, delta: null }
  if (!previous) return { latest, previous: null, delta: null }

  return {
    latest,
    previous,
    delta: {
      weight: calculateDelta(toNum(latest.weight), toNum(previous.weight)),
      bodyFat: calculateDelta(toNum(latest.bodyFat), toNum(previous.bodyFat)),
      muscleMass: calculateDelta(toNum(latest.muscleMass), toNum(previous.muscleMass)),
      visceralFat: calculateDelta(toNum(latest.visceralFat), toNum(previous.visceralFat)),
      boneMass: calculateDelta(toNum(latest.boneMass), toNum(previous.boneMass)),
      bodyWater: calculateDelta(toNum(latest.bodyWater), toNum(previous.bodyWater)),
    },
  }
}

export async function getBodyCompositionById(
  id: string,
  userId: string,
): Promise<BodyCompositionHistoryRecord | null> {
  const [record] = await db
    .select()
    .from(bodyCompositionHistory)
    .where(and(eq(bodyCompositionHistory.id, id), eq(bodyCompositionHistory.userId, userId)))
    .limit(1)

  return record ?? null
}

function toNum(val: string | null | undefined): number | null {
  if (val == null) return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

export function calculateDelta(current: number | null, previous: number | null): string | null {
  if (current == null || previous == null) return null
  const diff = current - previous
  if (Math.abs(diff) < 1) return 'estável'
  const arrow = diff > 0 ? '↑' : '↓'
  return `${arrow} ${Math.abs(diff).toFixed(1)}`
}
