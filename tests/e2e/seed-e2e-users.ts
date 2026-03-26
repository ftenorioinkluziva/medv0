import 'dotenv/config'
import bcryptjs from 'bcryptjs'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'
import { users } from '../../src/lib/db/schema'

const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Test@12345'

const E2E_USERS = [
  {
    email: process.env.E2E_USER_NEW_EMAIL ?? 'e2e-new@test.sami.local',
    onboardingCompleted: false,
  },
  {
    email: process.env.E2E_USER_DONE_EMAIL ?? 'e2e-done@test.sami.local',
    onboardingCompleted: true,
  },
]

async function seedE2EUsers() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle({ client: sql })

  const passwordHash = await bcryptjs.hash(PASSWORD, 10)

  for (const user of E2E_USERS) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(users)
        .set({ passwordHash, onboardingCompleted: user.onboardingCompleted, isActive: true })
        .where(eq(users.email, user.email))
      console.log(`updated: ${user.email}`)
    } else {
      await db.insert(users).values({
        email: user.email,
        passwordHash,
        role: 'patient',
        onboardingCompleted: user.onboardingCompleted,
        isActive: true,
      })
      console.log(`created: ${user.email}`)
    }
  }

  console.log('E2E users ready.')
  process.exit(0)
}

seedE2EUsers().catch((err) => {
  console.error(err)
  process.exit(1)
})
