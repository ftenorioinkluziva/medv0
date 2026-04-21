import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { medicalProfiles, bodyCompositionHistory } from '@/lib/db/schema'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

export interface BodyCompositionMetrics {
  weight?: number
  bodyFat?: number
  muscleMass?: number
  visceralFat?: number
  boneMass?: number
  bmr?: number
  bodyWater?: number
  measuredAt?: string
}

const METRIC_KEYWORDS: Record<keyof Omit<BodyCompositionMetrics, 'measuredAt'>, string[]> = {
  bodyFat: ['gordura corporal', 'body fat', '% gordura', 'percentual de gordura', 'gordura total'],
  muscleMass: ['massa muscular', 'muscle mass', 'massa magra', 'lean mass'],
  visceralFat: ['gordura visceral', 'visceral fat', 'nível visceral', 'gordura intra-abdominal'],
  boneMass: ['massa óssea', 'bone mass', 'mineral ósseo'],
  bmr: ['taxa metabólica basal', 'basal metabolic rate', 'tmb', 'bmr', 'metabolismo basal'],
  bodyWater: ['água corporal', 'body water', '% água', 'percentual de água'],
  weight: ['peso', 'weight', 'massa corporal total'],
}

function parseNumericValue(raw: string | number): number | undefined {
  if (typeof raw === 'number') return isFinite(raw) ? raw : undefined
  const match = String(raw).match(/([\d.,]+)/)
  if (!match) return undefined
  const numStr = match[1]
  // "1.430" pattern: dot followed by exactly 3 digits at end = thousands separator (PT-BR)
  // "25.3" pattern: dot followed by 1–2 digits = decimal separator
  let normalized: string
  if (/^\d+\.\d{3}$/.test(numStr)) {
    normalized = numStr.replace('.', '')
  } else {
    normalized = numStr.replace(/,/g, '.')
  }
  const val = parseFloat(normalized)
  return isFinite(val) ? val : undefined
}

export function extractBodyCompositionMetrics(
  structuredData: SanitizedMedicalDocument,
): BodyCompositionMetrics {
  const metrics: BodyCompositionMetrics = {}

  if (structuredData.examDate && structuredData.examDate !== 'null') {
    metrics.measuredAt = structuredData.examDate
  }

  for (const module of structuredData.modules) {
    for (const param of module.parameters) {
      const nameLower = param.name.toLowerCase()

      for (const [field, keywords] of Object.entries(METRIC_KEYWORDS) as [
        keyof Omit<BodyCompositionMetrics, 'measuredAt'>,
        string[],
      ][]) {
        if (metrics[field] !== undefined) continue
        if (keywords.some((kw) => nameLower.includes(kw))) {
          const parsed = parseNumericValue(param.value)
          if (parsed !== undefined) {
            metrics[field] = parsed
          }
        }
      }
    }
  }

  return metrics
}

export async function updateBodyComposition(
  userId: string,
  documentId: string,
  structuredData: SanitizedMedicalDocument,
): Promise<void> {
  const metrics = extractBodyCompositionMetrics(structuredData)
  const measuredAt = metrics.measuredAt ?? new Date().toISOString().split('T')[0]

  const profileUpdates: Record<string, number | string | null> = {}
  if (metrics.weight !== undefined) profileUpdates.weight = String(metrics.weight)
  if (metrics.bodyFat !== undefined) profileUpdates.bodyFatPercentage = String(metrics.bodyFat)
  if (metrics.muscleMass !== undefined) profileUpdates.muscleMass = String(metrics.muscleMass)
  if (metrics.visceralFat !== undefined)
    profileUpdates.visceralFatLevel = String(metrics.visceralFat)
  if (metrics.boneMass !== undefined) profileUpdates.boneMass = String(metrics.boneMass)
  if (metrics.bmr !== undefined) profileUpdates.basalMetabolicRate = metrics.bmr
  if (metrics.bodyWater !== undefined)
    profileUpdates.bodyWaterPercentage = String(metrics.bodyWater)

  if (Object.keys(profileUpdates).length > 0) {
    await db
      .update(medicalProfiles)
      .set({ ...profileUpdates, updatedAt: new Date() })
      .where(eq(medicalProfiles.userId, userId))
  }

  await db.insert(bodyCompositionHistory).values({
    userId,
    documentId,
    weight: metrics.weight !== undefined ? String(metrics.weight) : null,
    bodyFat: metrics.bodyFat !== undefined ? String(metrics.bodyFat) : null,
    muscleMass: metrics.muscleMass !== undefined ? String(metrics.muscleMass) : null,
    visceralFat: metrics.visceralFat !== undefined ? String(metrics.visceralFat) : null,
    boneMass: metrics.boneMass !== undefined ? String(metrics.boneMass) : null,
    bmr: metrics.bmr ?? null,
    bodyWater: metrics.bodyWater !== undefined ? String(metrics.bodyWater) : null,
    measuredAt,
  })
}
