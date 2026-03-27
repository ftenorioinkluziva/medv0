import bcryptjs from 'bcryptjs'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@sami.local'
  const password = process.env.ADMIN_PASSWORD

  if (!password) {
    console.warn('⚠️  ADMIN_PASSWORD not set — skipping admin seed')
    return
  }

  const passwordHash = await bcryptjs.hash(password, 12)

  await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: 'admin',
      isActive: true,
      onboardingCompleted: true,
    })
    .onConflictDoNothing()

  console.log(`✅ Admin seed: ${email}`)
}
