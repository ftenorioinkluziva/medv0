import 'dotenv/config'
import { seedAdmin } from '@/lib/db/seed/admin'
import { seedHealthAgents } from '@/lib/db/seed/health-agents'
import { logger } from '@/lib/observability/logger'

async function seed() {
  await seedAdmin()
  await seedHealthAgents()
}

seed()
  .then(() => {
    logger.info('✅ Done')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('❌ Seed failed', error)
    process.exit(1)
  })
