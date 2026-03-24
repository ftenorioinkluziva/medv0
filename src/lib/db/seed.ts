async function seed() {
  console.log('Seed completed (no initial data required for Story 1.1)')
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
