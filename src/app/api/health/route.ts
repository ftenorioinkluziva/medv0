import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/observability/logger'

export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('DB timeout')), 5000)
      }),
    ])
    clearTimeout(timer)

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    clearTimeout(timer)
    const errorType = err instanceof Error ? err.constructor.name : 'UnknownError'
    logger.error('[health] db check failed', { errorType })
    return NextResponse.json(
      {
        status: 'degraded',
        db: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
