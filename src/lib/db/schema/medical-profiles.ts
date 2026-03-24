import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const medicalProfiles = pgTable('medical_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: varchar('full_name', { length: 255 }),
  dateOfBirth: varchar('date_of_birth', { length: 10 }),
  gender: varchar('gender', { length: 20 }),
  height: integer('height'),
  weight: integer('weight'),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type MedicalProfile = typeof medicalProfiles.$inferSelect
export type NewMedicalProfile = typeof medicalProfiles.$inferInsert
