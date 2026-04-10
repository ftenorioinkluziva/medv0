import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    execute: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  sql: vi.fn((strings: TemplateStringsArray) => strings[0]),
}))

import { db } from '@/lib/db/client'
import { GET } from '@/app/api/health/route'

const mockDb = db as unknown as { execute: ReturnType<typeof vi.fn> }

describe('GET /api/health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna status 200 com db connected quando o banco responde', async () => {
    // #given
    mockDb.execute.mockResolvedValue([{ 1: 1 }])

    // #when
    const response = await GET()
    const body = await response.json()

    // #then
    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.db).toBe('connected')
    expect(body.timestamp).toBeDefined()
  })

  it('retorna status 503 com db disconnected quando o banco falha', async () => {
    // #given
    mockDb.execute.mockRejectedValue(new Error('Connection refused'))

    // #when
    const response = await GET()
    const body = await response.json()

    // #then
    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.db).toBe('disconnected')
    expect(body.timestamp).toBeDefined()
  })

  it('retorna status 503 quando o DB excede timeout de 5s', async () => {
    // #given — DB nunca resolve, forçando o branch de timeout do Promise.race
    mockDb.execute.mockImplementation(() => new Promise(() => {}))
    vi.useFakeTimers()

    // #when
    const responsePromise = GET()
    vi.advanceTimersByTime(6000)
    const response = await responsePromise
    const body = await response.json()

    // #then
    expect(response.status).toBe(503)
    expect(body.db).toBe('disconnected')

    vi.useRealTimers()
  })

  it('timestamp está em formato ISO', async () => {
    // #given
    mockDb.execute.mockResolvedValue([{ 1: 1 }])

    // #when
    const response = await GET()
    const body = await response.json()

    // #then
    expect(() => new Date(body.timestamp)).not.toThrow()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })
})
