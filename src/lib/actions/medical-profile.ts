'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { medicalProfiles } from '@/lib/db/schema'
import type { ExerciseActivity } from '@/lib/db/schema'

const ExerciseActivitySchema = z.object({
  type: z.string().min(1),
  frequency: z.number().int().min(1).max(7),
  duration: z.number().int().min(1),
  intensity: z.enum(['leve', 'moderada', 'intensa']),
})

const MedicalProfileSchema = z.object({
  // Obrigatórios
  age: z.number().int().min(0).max(150),
  gender: z.enum(['masculino', 'feminino', 'outro']),
  height: z.number().int().min(1).max(300),
  weight: z.string().regex(/^\d+(\.\d{1,2})?$/),
  systolicPressure: z.number().int().min(1).max(300),
  diastolicPressure: z.number().int().min(1).max(200),
  restingHeartRate: z.number().int().min(1),
  healthObjectives: z.string().min(1),

  // Opcionais básicos
  medicalConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  surgeries: z.array(z.string()).optional(),
  familyHistory: z.string().nullish(),
  notes: z.string().nullish(),

  // Composição corporal manual
  bodyFatPercentage: z.string().optional(),
  muscleMass: z.string().optional(),
  visceralFatLevel: z.string().optional(),
  boneMass: z.string().optional(),
  basalMetabolicRate: z.number().int().min(0).optional(),
  bodyWaterPercentage: z.string().optional(),

  // Testes funcionais / desempenho
  handgripStrength: z.string().optional(),
  sitToStandTime: z.string().optional(),
  vo2Max: z.string().optional(),
  co2ToleranceTest: z.string().optional(),

  // Avançados: Sono
  sleepHours: z.string().optional(),
  sleepQuality: z.number().int().min(1).max(10).optional(),
  sleepIssues: z.string().nullish(),
  timeInBed: z.string().optional(),
  sleepRegularity: z.string().nullish(),

  // Avançados: Estilo de vida
  dailyWaterIntake: z.string().optional(),
  stressLevel: z.number().int().min(1).max(10).optional(),
  stressManagement: z.string().nullish(),
  smokingStatus: z.enum(['nunca_fumou', 'ex-fumante', 'fumante']).optional(),
  smokingDetails: z.string().nullish(),
  alcoholConsumption: z.enum(['nunca', 'social', 'regular', 'frequente']).optional(),
  supplementation: z.array(z.string()).optional(),
  currentDiet: z.string().nullish(),

  // Avançados: Atividade física
  exerciseActivities: z.array(ExerciseActivitySchema).optional(),
  exerciseTypes: z.array(z.string()).optional(),
  exerciseFrequency: z.number().int().min(0).max(7).optional(),
  exerciseDuration: z.number().int().min(0).optional(),
  exerciseIntensity: z.string().nullish(),
  physicalLimitations: z.string().nullish(),

  // Avançados: Cronobiologia
  firstSunlightExposureTime: z.string().nullish(),
  lastMealTime: z.string().nullish(),
  artificialLightExposureStart: z.string().nullish(),
  artificialLightExposureEnd: z.string().nullish(),
  artificialLightExposureTime: z.string().nullish(),
}).refine(
  (d) => d.systolicPressure > d.diastolicPressure,
  { message: 'Pressão sistólica deve ser maior que a diastólica', path: ['systolicPressure'] },
)

export type UpsertMedicalProfileInput = z.infer<typeof MedicalProfileSchema>

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function upsertMedicalProfile(
  data: UpsertMedicalProfileInput,
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Não autorizado' }
  }

  const parsed = MedicalProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const v = parsed.data

  const fields = {
    age: v.age,
    gender: v.gender,
    height: v.height,
    weight: v.weight,
    systolicPressure: v.systolicPressure,
    diastolicPressure: v.diastolicPressure,
    restingHeartRate: v.restingHeartRate,
    healthObjectives: v.healthObjectives,
    medicalConditions: v.medicalConditions,
    medications: v.medications,
    allergies: v.allergies,
    surgeries: v.surgeries,
    familyHistory: v.familyHistory,
    notes: v.notes,
    bodyFatPercentage: v.bodyFatPercentage,
    muscleMass: v.muscleMass,
    visceralFatLevel: v.visceralFatLevel,
    boneMass: v.boneMass,
    basalMetabolicRate: v.basalMetabolicRate,
    bodyWaterPercentage: v.bodyWaterPercentage,
    handgripStrength: v.handgripStrength,
    sitToStandTime: v.sitToStandTime,
    vo2Max: v.vo2Max,
    co2ToleranceTest: v.co2ToleranceTest,
    sleepHours: v.sleepHours,
    sleepQuality: v.sleepQuality,
    sleepIssues: v.sleepIssues,
    timeInBed: v.timeInBed,
    sleepRegularity: v.sleepRegularity,
    dailyWaterIntake: v.dailyWaterIntake,
    stressLevel: v.stressLevel,
    stressManagement: v.stressManagement,
    smokingStatus: v.smokingStatus,
    smokingDetails: v.smokingDetails,
    alcoholConsumption: v.alcoholConsumption,
    supplementation: v.supplementation,
    currentDiet: v.currentDiet,
    exerciseActivities: v.exerciseActivities as ExerciseActivity[] | undefined,
    exerciseTypes: v.exerciseTypes,
    exerciseFrequency: v.exerciseFrequency,
    exerciseDuration: v.exerciseDuration,
    exerciseIntensity: v.exerciseIntensity,
    physicalLimitations: v.physicalLimitations,
    firstSunlightExposureTime: v.firstSunlightExposureTime,
    lastMealTime: v.lastMealTime,
    artificialLightExposureStart: v.artificialLightExposureStart,
    artificialLightExposureEnd: v.artificialLightExposureEnd,
    artificialLightExposureTime: v.artificialLightExposureTime,
    updatedAt: new Date(),
  }

  await db
    .insert(medicalProfiles)
    .values({ userId: session.user.id, ...fields })
    .onConflictDoUpdate({
      target: medicalProfiles.userId,
      set: fields,
    })

  return { success: true }
}

export async function getMedicalProfile() {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }

  const profile = await db.query.medicalProfiles.findFirst({
    where: eq(medicalProfiles.userId, session.user.id),
  })

  return profile ?? null
}
