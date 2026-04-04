import { config as loadEnv } from 'dotenv'

interface CliOptions {
  dryRun: boolean
  limit?: number
  offset?: number
  legacyDatabaseUrl?: string
  author?: string
}

loadEnv({ path: '.env.local' })
loadEnv()

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--limit') {
      const value = Number(argv[index + 1])
      if (Number.isFinite(value) && value > 0) {
        options.limit = value
        index += 1
      }
      continue
    }

    if (arg === '--offset') {
      const value = Number(argv[index + 1])
      if (Number.isFinite(value) && value >= 0) {
        options.offset = value
        index += 1
      }
      continue
    }

    if (arg === '--legacy-database-url') {
      const value = argv[index + 1]
      if (value) {
        options.legacyDatabaseUrl = value
        index += 1
      }
      continue
    }

    if (arg === '--author') {
      const value = argv[index + 1]
      if (value) {
        options.author = value
        index += 1
      }
    }
  }

  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const legacyDatabaseUrl = options.legacyDatabaseUrl ?? process.env.LEGACY_DATABASE_URL

  if (!legacyDatabaseUrl) {
    throw new Error(
      [
        'LEGACY_DATABASE_URL não definido.',
        'Defina a variável em .env.local/.env ou passe por argumento.',
        'Exemplo PowerShell:',
        "$env:LEGACY_DATABASE_URL='postgresql://USER:PASSWORD@HOST/DB?sslmode=require'; pnpm db:import:legacy-knowledge -- --dry-run",
        'Exemplo com argumento:',
        "pnpm db:import:legacy-knowledge -- --dry-run --legacy-database-url 'postgresql://USER:PASSWORD@HOST/DB?sslmode=require'",
      ].join('\n'),
    )
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definido')
  }

  const { importLegacyKnowledge } = await import('@/lib/db/legacy-knowledge-import')

  console.log('[legacy-knowledge-import] starting', options)

  const summary = await importLegacyKnowledge({
    legacyDatabaseUrl,
    dryRun: options.dryRun,
    limit: options.limit,
    offset: options.offset,
    author: options.author,
  })

  console.log('[legacy-knowledge-import] summary')
  console.log(JSON.stringify(summary, null, 2))

  if (summary.failed > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('[legacy-knowledge-import] failed', error)
  process.exit(1)
})
