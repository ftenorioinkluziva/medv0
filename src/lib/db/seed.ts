import { seedAdmin } from '@/lib/db/seed/admin'

async function seed() {
  await seedAdmin()
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
