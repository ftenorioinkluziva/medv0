import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/auth/config', () => ({
  auth: (handler: (req: NextRequest) => Response) => handler,
}))

const proxyModule = await import('@/proxy')
const proxy = proxyModule.default as unknown as (req: NextRequest) => Promise<Response>

type TestSession = { user: { role: string; onboardingCompleted: boolean } }

function makeRequest(path: string, session: TestSession | null = null) {
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
    const req = makeRequest('/admin', { user: { role: 'patient', onboardingCompleted: true } })
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/\/$/)
  })

  it('redirects doctor to / when accessing /admin', async () => {
    const req = makeRequest('/admin', { user: { role: 'doctor', onboardingCompleted: true } })
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/\/$/)
  })

  it('allows admin to access /admin', async () => {
    const req = makeRequest('/admin', { user: { role: 'admin', onboardingCompleted: true } })
    const res = await proxy(req)
    expect(res.status).toBe(200)
  })

  it('allows admin to access /admin/agents', async () => {
    const req = makeRequest('/admin/agents', { user: { role: 'admin', onboardingCompleted: true } })
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
    const req = makeRequest('/app/dashboard', { user: { role: 'patient', onboardingCompleted: true } })
    const res = await proxy(req)
    expect(res.status).toBe(200)
  })

  it('redirects admin away from /app to /admin', async () => {
    const req = makeRequest('/app/dashboard', { user: { role: 'admin', onboardingCompleted: true } })
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin')
  })
})

describe('proxy — / root redirect', () => {
  it('redirects unauthenticated from / to /auth/login', async () => {
    const req = makeRequest('/', null)
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('redirects authenticated admin from / to /admin', async () => {
    const req = makeRequest('/', { user: { role: 'admin', onboardingCompleted: true } })
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin')
  })

  it('redirects patient with onboarding complete from / to /app/dashboard', async () => {
    const req = makeRequest('/', { user: { role: 'patient', onboardingCompleted: true } })
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/app/dashboard')
  })

  it('redirects patient with pending onboarding from / to /app/onboarding', async () => {
    const req = makeRequest('/', { user: { role: 'patient', onboardingCompleted: false } })
    const res = await proxy(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/app/onboarding')
  })
})

describe('proxy — /auth routes', () => {
  it('allows unauthenticated access to /auth/login', async () => {
    const req = makeRequest('/auth/login', null)
    const res = await proxy(req)
    expect(res.status).toBe(200)
  })
})
