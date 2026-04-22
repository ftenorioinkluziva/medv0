import {
  pgTable,
  uuid,
  integer,
  numeric,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const medicalProfiles = pgTable('medical_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Dados básicos obrigatórios
  age: integer('age').notNull(),
  gender: text('gender').notNull(), // masculino | feminino | outro
  height: integer('height').notNull(), // cm
  weight: numeric('weight', { precision: 5, scale: 2 }).notNull(), // kg
  systolicPressure: integer('systolic_pressure').notNull(), // mmHg
  diastolicPressure: integer('diastolic_pressure').notNull(), // mmHg
  restingHeartRate: integer('resting_heart_rate').notNull(), // bpm
  healthObjectives: text('health_objectives').notNull(),

  // Dados opcionais básicos
  medicalConditions: text('medical_conditions').array(),
  medications: text('medications').array(),
  allergies: text('allergies').array(),
  surgeries: text('surgeries').array(),
  familyHistory: text('family_history'),
  notes: text('notes'),

  // Biomarkers opcionais (laboratoriais/funcionais)
  handgripStrength: numeric('handgrip_strength', { precision: 5, scale: 2 }),
  sitToStandTime: numeric('sit_to_stand_time', { precision: 5, scale: 2 }),
  vo2Max: numeric('vo2_max', { precision: 5, scale: 2 }),
  bodyFatPercentage: numeric('body_fat_percentage', { precision: 5, scale: 2 }),
  co2ToleranceTest: numeric('co2_tolerance_test', { precision: 5, scale: 2 }),
  latestBiomarkers: jsonb('latest_biomarkers'),
  biomarkersUpdatedAt: timestamp('biomarkers_updated_at'),

  // Bioimpedância (AC1 — Story 11.2)
  muscleMass: numeric('muscle_mass', { precision: 5, scale: 2 }),
  visceralFatLevel: numeric('visceral_fat_level', { precision: 5, scale: 2 }),
  boneMass: numeric('bone_mass', { precision: 5, scale: 2 }),
  basalMetabolicRate: integer('basal_metabolic_rate'),
  bodyWaterPercentage: numeric('body_water_percentage', { precision: 5, scale: 2 }),

  // InBody avançado (AC1 — Story 15.1)
  bodyWaterLiters: numeric('body_water_liters', { precision: 5, scale: 2 }),
  proteinMass: numeric('protein_mass', { precision: 5, scale: 2 }),
  waistHipRatio: numeric('waist_hip_ratio', { precision: 4, scale: 3 }),
  obesityDegree: numeric('obesity_degree', { precision: 5, scale: 2 }),
  inbodyScore: integer('inbody_score'),
  idealWeight: numeric('ideal_weight', { precision: 5, scale: 2 }),

  // AC1 — Dados avançados: Sono
  sleepHours: numeric('sleep_hours', { precision: 4, scale: 1 }),
  sleepQuality: integer('sleep_quality'), // 1-10
  sleepIssues: text('sleep_issues'),
  timeInBed: numeric('time_in_bed', { precision: 4, scale: 1 }),
  sleepRegularity: text('sleep_regularity'),

  // AC1 — Dados avançados: Estilo de vida
  dailyWaterIntake: numeric('daily_water_intake', { precision: 4, scale: 1 }), // litros
  stressLevel: integer('stress_level'), // 1-10
  stressManagement: text('stress_management'),
  smokingStatus: text('smoking_status'), // nunca_fumou | ex-fumante | fumante
  smokingDetails: text('smoking_details'),
  alcoholConsumption: text('alcohol_consumption'), // nunca | social | regular | frequente
  supplementation: text('supplementation').array(),
  currentDiet: text('current_diet'),

  // AC1 — Dados avançados: Atividade física
  exerciseActivities: jsonb('exercise_activities'), // ExerciseActivity[]
  exerciseTypes: text('exercise_types').array(), // legado
  exerciseFrequency: integer('exercise_frequency'), // dias/semana
  exerciseDuration: integer('exercise_duration'), // minutos
  exerciseIntensity: text('exercise_intensity'),
  physicalLimitations: text('physical_limitations'),

  // AC1 — Dados avançados: Cronobiologia
  firstSunlightExposureTime: text('first_sunlight_exposure_time'), // HH:MM
  lastMealTime: text('last_meal_time'), // HH:MM
  artificialLightExposureStart: text('artificial_light_exposure_start'), // HH:MM
  artificialLightExposureEnd: text('artificial_light_exposure_end'), // HH:MM
  artificialLightExposureTime: text('artificial_light_exposure_time'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type MedicalProfile = typeof medicalProfiles.$inferSelect
export type NewMedicalProfile = typeof medicalProfiles.$inferInsert

export interface ExerciseActivity {
  type: string
  frequency: number // dias/semana
  duration: number // minutos
  intensity: 'leve' | 'moderada' | 'intensa'
}
