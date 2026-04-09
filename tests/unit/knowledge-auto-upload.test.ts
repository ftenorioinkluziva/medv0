import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ai/rag/uploader', () => ({
  upsertKnowledgeArticle: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }),
  },
}))

import { auth } from '@/lib/auth/config'
import { upsertKnowledgeArticle } from '@/lib/ai/rag/uploader'
import { GET, POST } from '@/app/api/admin/knowledge/auto-upload/route'
import { NextRequest } from 'next/server'
import { chunkText } from '@/lib/ai/rag/chunker'

const adminSession = {
  user: { id: 'admin-1', role: 'admin', email: 'admin@test.com', name: 'Admin', onboardingCompleted: true },
} as never

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/admin/knowledge/auto-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const validPayload = {
  title: 'Vitamina D3 e Imunidade',
  content: 'Vitamina D3 desempenha papel crucial na regulação do sistema imunológico.',
  source: 'Dr. Silva',
  language: 'pt-BR',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(adminSession)
})

describe('POST /api/admin/knowledge/auto-upload', () => {
  describe('AC2 — validação de payload', () => {
    it('retorna 400 quando payload é inválido (title ausente)', async () => {
      // #given
      const req = makeRequest({ content: 'algum conteúdo' })

      // #when
      const res = await POST(req)

      // #then
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Validation failed')
      expect(json.details).toBeDefined()
    })

    it('retorna 413 quando content excede 500k caracteres', async () => {
      // #given
      const req = makeRequest({ ...validPayload, content: 'x'.repeat(500_001) })

      // #when
      const res = await POST(req)

      // #then
      expect(res.status).toBe(413)
      const json = await res.json()
      expect(json.error).toContain('Content too large')
    })
  })

  describe('erro interno', () => {
    it('retorna 500 quando upsertKnowledgeArticle lança erro', async () => {
      // #given
      vi.mocked(upsertKnowledgeArticle).mockRejectedValue(new Error('DB connection failed'))
      const req = makeRequest(validPayload)

      // #when
      const res = await POST(req)

      // #then
      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json).toEqual({ error: 'Internal server error' })
    })
  })

  describe('AC5 — upsert de artigos', () => {
    it('retorna action=created para artigo novo', async () => {
      // #given
      vi.mocked(upsertKnowledgeArticle).mockResolvedValue({
        articleId: 'uuid-123',
        chunksCreated: 1,
        action: 'created',
      })
      const req = makeRequest(validPayload)

      // #when
      const res = await POST(req)

      // #then
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        success: true,
        articleId: 'uuid-123',
        chunksCreated: 1,
        action: 'created',
      })
    })

    it('retorna action=updated e não duplica artigo existente', async () => {
      // #given
      vi.mocked(upsertKnowledgeArticle).mockResolvedValue({
        articleId: 'uuid-existing',
        chunksCreated: 2,
        action: 'updated',
      })

      // #when — duas requests independentes com mesmo payload
      const res1 = await POST(makeRequest(validPayload))
      const res2 = await POST(makeRequest(validPayload))

      // #then — upsert chamado 2x, ambos retornam action=updated (não cria duplicata)
      expect(upsertKnowledgeArticle).toHaveBeenCalledTimes(2)
      expect(res1.status).toBe(200)
      expect(res2.status).toBe(200)
      const json = await res2.json()
      expect(json.action).toBe('updated')
      expect(json.success).toBe(true)
    })
  })
})

describe('chunkText — AC3', () => {
  it('retorna array com 1 chunk para texto curto (< 2000 chars)', () => {
    // #given
    const short = 'Texto curto que não precisa de chunking.'.repeat(10) // ~400 chars

    // #when
    const chunks = chunkText(short)

    // #then
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe(short)
  })

  it('divide texto longo em múltiplos chunks com overlap', () => {
    // #given
    const paragraph = 'Palavra '.repeat(50) // ~400 chars per paragraph
    const longText = Array.from({ length: 10 }, () => paragraph).join('\n\n') // ~4400 chars

    // #when
    const chunks = chunkText(longText, 2000, 200)

    // #then
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(2000)
    })
  })
})
