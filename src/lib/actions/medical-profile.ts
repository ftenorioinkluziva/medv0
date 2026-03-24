'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { medicalProfiles } from '@/lib/db/schema'

const MedicalProfileSchema = z.object({
  // Obrigatórios
  age: z.number().int().min(0).max(150),
  gender: z.enum(['masculino', 'feminino', 'outro']),
  height: z.number().int().min(1).max(300),
  weight: z.string().regex(/^\d+(\.\d{1,2})?$/),
  systolicPressure: z.number().int().min(1),
  diastolicPressure: z.number().int().min(1),
  restingHeartRate: z.number().int().min(1),
  healthObjectives: z.string().min(1),

  // Opcionais
  medicalConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  surgeries: z.array(z.string()).optional(),
  familyHistory: z.string().optional(),
  notes: z.string().optional(),

  // Biomarkers opcionais
  handgripStrength: z.string().optional(),
  sitToStandTime: z.string().optional(),
  vo2Max: z.string().optional(),
  bodyFatPercentage: z.string().optional(),
  co2ToleranceTest: z.string().optional(),
})

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

  const values = parsed.data

  await db
    .insert(medicalProfiles)
    .values({
      userId: session.user.id,
      age: values.age,
      gender: values.gender,
      height: values.height,
      weight: values.weight,
      systolicPressure: values.systolicPressure,
      diastolicPressure: values.diastolicPressure,
      restingHeartRate: values.restingHeartRate,
      healthObjectives: values.healthObjectives,
      medicalConditions: values.medicalConditions,
      medications: values.medications,
      allergies: values.allergies,
      surgeries: values.surgeries,
      familyHistory: values.familyHistory,
      notes: values.notes,
      handgripStrength: values.handgripStrength,
      sitToStandTime: values.sitToStandTime,
      vo2Max: values.vo2Max,
      bodyFatPercentage: values.bodyFatPercentage,
      co2ToleranceTest: values.co2ToleranceTest,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: medicalProfiles.userId,
      set: {
        age: values.age,
        gender: values.gender,
        height: values.height,
        weight: values.weight,
        systolicPressure: values.systolicPressure,
        diastolicPressure: values.diastolicPressure,
        restingHeartRate: values.restingHeartRate,
        healthObjectives: values.healthObjectives,
        medicalConditions: values.medicalConditions,
        medications: values.medications,
        allergies: values.allergies,
        surgeries: values.surgeries,
        familyHistory: values.familyHistory,
        notes: values.notes,
        handgripStrength: values.handgripStrength,
        sitToStandTime: values.sitToStandTime,
        vo2Max: values.vo2Max,
        bodyFatPercentage: values.bodyFatPercentage,
        co2ToleranceTest: values.co2ToleranceTest,
        updatedAt: new Date(),
      },
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
