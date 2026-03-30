import { seedAdmin } from '@/lib/db/seed/admin'
import { seedHealthAgents } from '@/lib/db/seed/health-agents'

async function seed() {
  await seedAdmin()
  await seedHealthAgents()
}

seed()
  .then(() => {
    console.log('✅ Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  })
