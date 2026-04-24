import bcryptjs from 'bcryptjs'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { logger } from '@/lib/observability/logger'

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@sami.local'
  const password = process.env.ADMIN_PASSWORD

  if (!password) {
    logger.warn('⚠️  ADMIN_PASSWORD not set — skipping admin seed')
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

  logger.info(`✅ Admin seed: ${email}`)
}
