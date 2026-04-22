import { pgTable, uuid, numeric, integer, date, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { documents } from './documents'

export const bodyCompositionHistory = pgTable(
  'body_composition_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    documentId: uuid('document_id').references(() => documents.id),
    weight: numeric('weight', { precision: 5, scale: 2 }),
    bodyFat: numeric('body_fat', { precision: 5, scale: 2 }),
    muscleMass: numeric('muscle_mass', { precision: 5, scale: 2 }),
    visceralFat: numeric('visceral_fat', { precision: 5, scale: 2 }),
    boneMass: numeric('bone_mass', { precision: 5, scale: 2 }),
    bmr: integer('bmr'),
    bodyWater: numeric('body_water', { precision: 5, scale: 2 }),

    // InBody avançado (AC1+AC2 — Story 15.1)
    bodyWaterLiters: numeric('body_water_liters', { precision: 5, scale: 2 }),
    proteinMass: numeric('protein_mass', { precision: 5, scale: 2 }),
    waistHipRatio: numeric('waist_hip_ratio', { precision: 4, scale: 3 }),
    obesityDegree: numeric('obesity_degree', { precision: 5, scale: 2 }),
    inbodyScore: integer('inbody_score'),
    idealWeight: numeric('ideal_weight', { precision: 5, scale: 2 }),

    // Segmentais (AC2 — Story 15.1)
    leanMassArmRight: numeric('lean_mass_arm_right', { precision: 5, scale: 2 }),
    leanMassArmLeft: numeric('lean_mass_arm_left', { precision: 5, scale: 2 }),
    leanMassTrunk: numeric('lean_mass_trunk', { precision: 5, scale: 2 }),
    leanMassLegRight: numeric('lean_mass_leg_right', { precision: 5, scale: 2 }),
    leanMassLegLeft: numeric('lean_mass_leg_left', { precision: 5, scale: 2 }),
    fatMassArmRight: numeric('fat_mass_arm_right', { precision: 5, scale: 2 }),
    fatMassArmLeft: numeric('fat_mass_arm_left', { precision: 5, scale: 2 }),
    fatMassTrunk: numeric('fat_mass_trunk', { precision: 5, scale: 2 }),
    fatMassLegRight: numeric('fat_mass_leg_right', { precision: 5, scale: 2 }),
    fatMassLegLeft: numeric('fat_mass_leg_left', { precision: 5, scale: 2 }),

    measuredAt: date('measured_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('body_composition_history_user_date_idx').on(table.userId, table.measuredAt),
  ],
)

export type BodyCompositionHistoryRecord = typeof bodyCompositionHistory.$inferSelect
export type NewBodyCompositionHistoryRecord = typeof bodyCompositionHistory.$inferInsert
