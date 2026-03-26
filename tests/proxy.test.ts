import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/auth/config', () => ({
  auth: (handler: (req: NextRequest) => Response) => handler,
}))

const proxyModule = await import('@/proxy')
const proxy = proxyModule.default as unknown as (req: NextRequest) => Promise<Response>

function makeRequest(path: string, session: { user: { role: string } } | null = null) {
  const req = new NextRequest(`http://localhost${path}`) as NextRequest & {
    auth: typeof session
  }
  req.auth = session
  return req
}

describe('proxy — /admin routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirects unauthenticated to /auth/login with callbackUrl', async () => {
    const req = makeRequest('/admin/agents', null)
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
    expect(res.headers.get('location')).toContain('callbackUrl=%2Fadmin')
  })

  it('redirects patient to / when accessing /admin', async () => {
    const req = makeRequest('/admin', { user: { role: 'patient' } })
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/\/$/)
  })

  it('allows admin to access /admin', async () => {
    const req = makeRequest('/admin', { user: { role: 'admin' } })
    const res = await proxy(req)
    expect(res.status).toBe(200)
  })

  it('allows admin to access /admin/agents', async () => {
    const req = makeRequest('/admin/agents', { user: { role: 'admin' } })
    const res = await proxy(req)
    expect(res.status).toBe(200)
  })
})

describe('proxy — /app routes', () => {
  it('redirects unauthenticated to /auth/login with callbackUrl', async () => {
    const req = makeRequest('/app/dashboard', null)
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
    expect(res.headers.get('location')).toContain('callbackUrl=%2Fapp%2Fdashboard')
  })

  it('allows authenticated patient to access /app', async () => {
    const req = makeRequest('/app/dashboard', { user: { role: 'patient' } })
    const res = await proxy(req)
    expect(res.status).toBe(200)
  })

  it('redirects admin away from /app to /admin', async () => {
    const req = makeRequest('/app/dashboard', { user: { role: 'admin' } })
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin')
  })
})

describe('proxy — / root redirect', () => {
  it('redirects authenticated admin from / to /admin', async () => {
    const req = makeRequest('/', { user: { role: 'admin' } })
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin')
  })

  it('does not redirect patient from /', async () => {
    const req = makeRequest('/', { user: { role: 'patient' } })
    const res = await proxy(req)
    expect(res.status).toBe(200)
  })
})

describe('proxy — /auth routes', () => {
  it('allows unauthenticated access to /auth/login', async () => {
    const req = makeRequest('/auth/login', null)
    const res = await proxy(req)
    expect(res.status).toBe(200)
  })
})
