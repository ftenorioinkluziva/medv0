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

  // AC1 — Dados básicos obrigatórios
  age: integer('age').notNull(),
  gender: text('gender').notNull(), // masculino | feminino | outro
  height: integer('height').notNull(), // cm
  weight: numeric('weight', { precision: 5, scale: 2 }).notNull(), // kg
  systolicPressure: integer('systolic_pressure').notNull(), // mmHg
  diastolicPressure: integer('diastolic_pressure').notNull(), // mmHg
  restingHeartRate: integer('resting_heart_rate').notNull(), // bpm
  healthObjectives: text('health_objectives').notNull(),

  // AC1 — Dados opcionais (nullable)
  medicalConditions: text('medical_conditions').array(),
  medications: text('medications').array(),
  allergies: text('allergies').array(),
  surgeries: text('surgeries').array(),
  familyHistory: text('family_history'),
  notes: text('notes'),

  // AC2 — Biomarkers opcionais (laboratoriais/funcionais)
  handgripStrength: numeric('handgrip_strength', { precision: 5, scale: 2 }), // kgf
  sitToStandTime: numeric('sit_to_stand_time', { precision: 5, scale: 2 }), // segundos
  vo2Max: numeric('vo2_max', { precision: 5, scale: 2 }),
  bodyFatPercentage: numeric('body_fat_percentage', { precision: 5, scale: 2 }),
  co2ToleranceTest: numeric('co2_tolerance_test', { precision: 5, scale: 2 }),
  latestBiomarkers: jsonb('latest_biomarkers'), // snapshot do último exame
  biomarkersUpdatedAt: timestamp('biomarkers_updated_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type MedicalProfile = typeof medicalProfiles.$inferSelect
export type NewMedicalProfile = typeof medicalProfiles.$inferInsert
