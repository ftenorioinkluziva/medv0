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
    measuredAt: date('measured_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('body_composition_history_user_date_idx').on(table.userId, table.measuredAt),
  ],
)

export type BodyCompositionHistoryRecord = typeof bodyCompositionHistory.$inferSelect
export type NewBodyCompositionHistoryRecord = typeof bodyCompositionHistory.$inferInsert
