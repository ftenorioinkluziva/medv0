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
  // AC1 — InBody advanced (Story 15.2)
  bodyWaterLiters?: number
  proteinMass?: number
  waistHipRatio?: number
  obesityDegree?: number
  inbodyScore?: number
  idealWeight?: number
  // AC2 — Segmental (Story 15.2)
  leanMassArmRight?: number
  leanMassArmLeft?: number
  leanMassTrunk?: number
  leanMassLegRight?: number
  leanMassLegLeft?: number
  fatMassArmRight?: number
  fatMassArmLeft?: number
  fatMassTrunk?: number
  fatMassLegRight?: number
  fatMassLegLeft?: number
}

type SegmentalKey =
  | 'leanMassArmRight'
  | 'leanMassArmLeft'
  | 'leanMassTrunk'
  | 'leanMassLegRight'
  | 'leanMassLegLeft'
  | 'fatMassArmRight'
  | 'fatMassArmLeft'
  | 'fatMassTrunk'
  | 'fatMassLegRight'
  | 'fatMassLegLeft'

type SimpleMetricKey = Exclude<keyof BodyCompositionMetrics, 'measuredAt' | SegmentalKey>

// Order matters: more specific keywords must precede overlapping generic ones.
// bodyWaterLiters before bodyWater; idealWeight before weight.
const METRIC_KEYWORDS: Record<SimpleMetricKey, string[]> = {
  bodyWaterLiters: ['água corporal total', 'total body water', 'tbw', 'água total'],
  bodyFat: ['gordura corporal', 'body fat', '% gordura', 'percentual de gordura', 'gordura total'],
  muscleMass: ['massa muscular', 'muscle mass', 'massa magra', 'lean mass'],
  visceralFat: ['gordura visceral', 'visceral fat', 'nível visceral', 'gordura intra-abdominal'],
  boneMass: ['massa óssea', 'bone mass', 'mineral ósseo'],
  bmr: ['taxa metabólica basal', 'basal metabolic rate', 'tmb', 'bmr', 'metabolismo basal'],
  bodyWater: ['% água', 'percentual de água', 'body water %', 'água corporal %', 'água corporal'],
  idealWeight: ['peso ideal', 'ideal weight', 'peso de referência'],
  weight: ['peso', 'weight', 'massa corporal total'],
  proteinMass: ['proteína', 'protein mass', 'massa proteica', 'proteínas'],
  waistHipRatio: [
    'relação cintura-quadril',
    'razão cintura/quadril',
    'rcq',
    'waist-hip ratio',
    'whr',
    'cintura/quadril',
  ],
  obesityDegree: ['grau de obesidade', 'obesity degree', 'grau obesidade'],
  inbodyScore: ['pontuação inbody', 'inbody score', 'escore inbody', 'resultado inbody'],
}

const LEAN_MODULE_KEYWORDS = [
  'massa magra segmentar',
  'lean mass segmental',
  'segmental lean',
  'análise segmentar de massa magra',
]
const FAT_MODULE_KEYWORDS = [
  'gordura segmentar',
  'fat segmental',
  'segmental fat',
  'análise segmentar de gordura',
]

const SEGMENT_MAP: Array<{ keys: string[]; lean: SegmentalKey; fat: SegmentalKey }> = [
  {
    keys: ['braço direito', 'right arm', 'braço d.', 'b. direito'],
    lean: 'leanMassArmRight',
    fat: 'fatMassArmRight',
  },
  {
    keys: ['braço esquerdo', 'left arm', 'braço e.', 'b. esquerdo'],
    lean: 'leanMassArmLeft',
    fat: 'fatMassArmLeft',
  },
  { keys: ['tronco', 'trunk'], lean: 'leanMassTrunk', fat: 'fatMassTrunk' },
  {
    keys: ['perna direita', 'right leg', 'perna d.', 'p. direita'],
    lean: 'leanMassLegRight',
    fat: 'fatMassLegRight',
  },
  {
    keys: ['perna esquerda', 'left leg', 'perna e.', 'p. esquerda'],
    lean: 'leanMassLegLeft',
    fat: 'fatMassLegLeft',
  },
]

// Composite fallback for params where both type + segment appear in the name
const COMPOSITE_SEGMENTAL: Array<{ field: SegmentalKey; mustContainAll: string[] }> = [
  { field: 'leanMassArmRight', mustContainAll: ['braço direito', 'massa magra'] },
  { field: 'leanMassArmLeft', mustContainAll: ['braço esquerdo', 'massa magra'] },
  { field: 'leanMassTrunk', mustContainAll: ['tronco', 'massa magra'] },
  { field: 'leanMassLegRight', mustContainAll: ['perna direita', 'massa magra'] },
  { field: 'leanMassLegLeft', mustContainAll: ['perna esquerda', 'massa magra'] },
  { field: 'fatMassArmRight', mustContainAll: ['braço direito', 'gordura'] },
  { field: 'fatMassArmLeft', mustContainAll: ['braço esquerdo', 'gordura'] },
  { field: 'fatMassTrunk', mustContainAll: ['tronco', 'gordura'] },
  { field: 'fatMassLegRight', mustContainAll: ['perna direita', 'gordura'] },
  { field: 'fatMassLegLeft', mustContainAll: ['perna esquerda', 'gordura'] },
  { field: 'leanMassArmRight', mustContainAll: ['right arm', 'lean'] },
  { field: 'leanMassArmLeft', mustContainAll: ['left arm', 'lean'] },
  { field: 'leanMassTrunk', mustContainAll: ['trunk', 'lean'] },
  { field: 'leanMassLegRight', mustContainAll: ['right leg', 'lean'] },
  { field: 'leanMassLegLeft', mustContainAll: ['left leg', 'lean'] },
  { field: 'fatMassArmRight', mustContainAll: ['right arm', 'fat'] },
  { field: 'fatMassArmLeft', mustContainAll: ['left arm', 'fat'] },
  { field: 'fatMassTrunk', mustContainAll: ['trunk', 'fat'] },
  { field: 'fatMassLegRight', mustContainAll: ['right leg', 'fat'] },
  { field: 'fatMassLegLeft', mustContainAll: ['left leg', 'fat'] },
]

function matchSegmentByContext(nameLower: string, type: 'lean' | 'fat'): SegmentalKey | null {
  for (const { keys, lean, fat } of SEGMENT_MAP) {
    if (keys.some((k) => nameLower.includes(k))) {
      return type === 'lean' ? lean : fat
    }
  }
  return null
}

function parseNumericValue(raw: string | number): number | undefined {
  if (typeof raw === 'number') return isFinite(raw) ? raw : undefined
  const match = String(raw).match(/([\d.,]+)/)
  if (!match) return undefined
  const numStr = match[1]
  // "1.430" pattern: integer > 0, dot, exactly 3 digits = thousands separator (PT-BR)
  // "0.850" or "25.3" patterns = decimal separator
  let normalized: string
  if (/^\d+\.\d{3}$/.test(numStr) && !numStr.startsWith('0.')) {
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
    const moduleLower = module.moduleName.toLowerCase()
    const isLeanSegmental = LEAN_MODULE_KEYWORDS.some((kw) => moduleLower.includes(kw))
    const isFatSegmental = FAT_MODULE_KEYWORDS.some((kw) => moduleLower.includes(kw))

    for (const param of module.parameters) {
      const nameLower = param.name.toLowerCase()
      const parsed = parseNumericValue(param.value)
      if (parsed === undefined) continue

      // AC2: Module-context segmental extraction (classic InBody format)
      if (isLeanSegmental || isFatSegmental) {
        const segType = isLeanSegmental ? 'lean' : 'fat'
        const segField = matchSegmentByContext(nameLower, segType)
        if (segField && metrics[segField] === undefined) {
          metrics[segField] = parsed
          continue
        }
      }

      // AC2: Composite name segmental fallback (param name has both type + segment)
      let matchedSegmental = false
      for (const { field, mustContainAll } of COMPOSITE_SEGMENTAL) {
        if (metrics[field] !== undefined) continue
        if (mustContainAll.every((kw) => nameLower.includes(kw))) {
          metrics[field] = parsed
          matchedSegmental = true
          break
        }
      }
      if (matchedSegmental) continue

      // Simple keyword matching — AC1 new fields + existing fields
      for (const [field, keywords] of Object.entries(METRIC_KEYWORDS) as [
        SimpleMetricKey,
        string[],
      ][]) {
        if (metrics[field] !== undefined) continue
        if (keywords.some((kw) => nameLower.includes(kw))) {
          metrics[field] = parsed
          break
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
  // AC1 — new InBody fields → medical_profiles
  if (metrics.bodyWaterLiters !== undefined)
    profileUpdates.bodyWaterLiters = String(metrics.bodyWaterLiters)
  if (metrics.proteinMass !== undefined) profileUpdates.proteinMass = String(metrics.proteinMass)
  if (metrics.waistHipRatio !== undefined)
    profileUpdates.waistHipRatio = String(metrics.waistHipRatio)
  if (metrics.obesityDegree !== undefined)
    profileUpdates.obesityDegree = String(metrics.obesityDegree)
  if (metrics.inbodyScore !== undefined) profileUpdates.inbodyScore = metrics.inbodyScore
  if (metrics.idealWeight !== undefined) profileUpdates.idealWeight = String(metrics.idealWeight)

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
    // AC1 — new InBody fields → bodyCompositionHistory
    bodyWaterLiters:
      metrics.bodyWaterLiters !== undefined ? String(metrics.bodyWaterLiters) : null,
    proteinMass: metrics.proteinMass !== undefined ? String(metrics.proteinMass) : null,
    waistHipRatio: metrics.waistHipRatio !== undefined ? String(metrics.waistHipRatio) : null,
    obesityDegree: metrics.obesityDegree !== undefined ? String(metrics.obesityDegree) : null,
    inbodyScore: metrics.inbodyScore ?? null,
    idealWeight: metrics.idealWeight !== undefined ? String(metrics.idealWeight) : null,
    // AC2 — segmental fields → bodyCompositionHistory
    leanMassArmRight:
      metrics.leanMassArmRight !== undefined ? String(metrics.leanMassArmRight) : null,
    leanMassArmLeft:
      metrics.leanMassArmLeft !== undefined ? String(metrics.leanMassArmLeft) : null,
    leanMassTrunk: metrics.leanMassTrunk !== undefined ? String(metrics.leanMassTrunk) : null,
    leanMassLegRight:
      metrics.leanMassLegRight !== undefined ? String(metrics.leanMassLegRight) : null,
    leanMassLegLeft:
      metrics.leanMassLegLeft !== undefined ? String(metrics.leanMassLegLeft) : null,
    fatMassArmRight:
      metrics.fatMassArmRight !== undefined ? String(metrics.fatMassArmRight) : null,
    fatMassArmLeft: metrics.fatMassArmLeft !== undefined ? String(metrics.fatMassArmLeft) : null,
    fatMassTrunk: metrics.fatMassTrunk !== undefined ? String(metrics.fatMassTrunk) : null,
    fatMassLegRight:
      metrics.fatMassLegRight !== undefined ? String(metrics.fatMassLegRight) : null,
    fatMassLegLeft: metrics.fatMassLegLeft !== undefined ? String(metrics.fatMassLegLeft) : null,
  })
}
