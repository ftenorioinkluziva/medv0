import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'

export async function GET() {
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB timeout')), 5000),
      ),
    ])

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch {
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
