import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/require-admin', () => {
  class UnauthorizedError extends Error {
    constructor() { super('Unauthorized'); this.name = 'UnauthorizedError' }
  }
  return {
    requireAdmin: vi.fn(),
    UnauthorizedError,
  }
})

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db/queries/health-agents', () => ({
  getAgentById: vi.fn(),
  countActiveFoundationAgents: vi.fn(),
}))

vi.mock('@/lib/db/queries/knowledge', () => ({
  getArticleById: vi.fn(),
}))

vi.mock('@/lib/db/queries/users', () => ({
  getUserById: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireAdmin, UnauthorizedError } from '@/lib/auth/require-admin'
import { auth } from '@/lib/auth/config'
import { toggleAgentAction, deleteAgentAction } from '@/app/admin/agents/_actions/agents'
import { deleteArticleAction } from '@/app/admin/knowledge/_actions/knowledge'
import { toggleUserActiveAction } from '@/app/admin/users/_actions/users'
import { associateArticlesAction, disassociateArticlesAction, toggleArticleGlobalAction } from '@/lib/actions/admin-knowledge'
import { GET, POST } from '@/app/api/admin/knowledge/auto-upload/route'
import { NextRequest } from 'next/server'

const makePostRequest = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/admin/knowledge/auto-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

const makeGetRequest = (source: string, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost/api/admin/knowledge/auto-upload?source=${encodeURIComponent(source)}`, {
    headers,
  })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AC4 — Server Actions: patient não pode executar mutações admin', () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockRejectedValue(new UnauthorizedError())
  })

  it('toggleAgentAction retorna Unauthorized para não-admin', async () => {
    // #given — requireAdmin lança Unauthorized (patient ou sem session)

    // #when
    const result = await toggleAgentAction('agent-1', true)

    // #then
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('deleteAgentAction retorna Unauthorized para não-admin', async () => {
    // #given
    // #when
    const result = await deleteAgentAction('agent-1')

    // #then
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('deleteArticleAction retorna Unauthorized para não-admin', async () => {
    // #given
    // #when
    const result = await deleteArticleAction('article-1')

    // #then
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('toggleUserActiveAction retorna Unauthorized para não-admin', async () => {
    // #given
    // #when
    const result = await toggleUserActiveAction('user-1', false)

    // #then
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('associateArticlesAction retorna Unauthorized para não-admin', async () => {
    // #given
    // #when
    const result = await associateArticlesAction('agent-1', ['article-1', 'article-2'])

    // #then
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('disassociateArticlesAction retorna Unauthorized para não-admin', async () => {
    // #given
    // #when
    const result = await disassociateArticlesAction('agent-1', ['article-1'])

    // #then
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('toggleArticleGlobalAction retorna Unauthorized para não-admin', async () => {
    // #given
    // #when
    const result = await toggleArticleGlobalAction('article-1', true)

    // #then
    expect(result).toEqual({ error: 'Unauthorized' })
  })
})

describe('AC4 — auto-upload POST: acesso sem credenciais', () => {
  it('retorna 401 sem session e sem API key', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue(null as never)
    const req = makePostRequest({ title: 'Test', content: 'Content' })

    // #when
    const res = await POST(req)

    // #then
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('retorna 401 com API key inválida', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue(null as never)
    process.env.KNOWLEDGE_UPLOAD_API_KEY = 'valid-secret-key'
    const req = makePostRequest(
      { title: 'Test', content: 'Content' },
      { 'x-api-key': 'wrong-key' },
    )

    // #when
    let res: Response
    try {
      res = await POST(req)
    } finally {
      delete process.env.KNOWLEDGE_UPLOAD_API_KEY
    }

    // #then
    expect(res!.status).toBe(401)
  })

  it('retorna 401 para session com role patient', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'patient', email: 'p@test.com', name: 'P', onboardingCompleted: true },
    } as never)
    const req = makePostRequest({ title: 'Test', content: 'Content' })

    // #when
    const res = await POST(req)

    // #then
    expect(res.status).toBe(401)
  })
})

describe('AC4 — auto-upload GET: acesso sem credenciais', () => {
  it('retorna 401 sem session e sem API key', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue(null as never)
    const req = makeGetRequest('http://example.com/video')

    // #when
    const res = await GET(req)

    // #then
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('retorna 401 para session com role patient', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'patient', email: 'p@test.com', name: 'P', onboardingCompleted: true },
    } as never)
    const req = makeGetRequest('http://example.com/video')

    // #when
    const res = await GET(req)

    // #then
    expect(res.status).toBe(401)
  })
})
