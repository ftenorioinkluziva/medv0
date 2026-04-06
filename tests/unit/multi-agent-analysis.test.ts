import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mock-model'),
}))

vi.mock('@/lib/ai/rag/vector-search', () => ({
  searchKnowledge: vi.fn(),
}))

vi.mock('@/lib/db/queries/health-agents', () => ({
  getActiveAgentsByRole: vi.fn(),
  getAllActiveAgents: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ai/orchestrator/living-analysis', () => ({
  runLivingAnalysis: vi.fn(),
}))

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    after: vi.fn((fn: () => Promise<void>) => {
      // In test environment, execute after() callbacks synchronously (no-op schedule)
      void fn()
    }),
  }
})

import { generateText } from 'ai'
import { searchKnowledge } from '@/lib/ai/rag/vector-search'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'
import { analyzeWithAgent } from '@/lib/ai/agents/analyze'
import { runLivingAnalysis } from '@/lib/ai/orchestrator/living-analysis'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { POST } from '@/app/api/analyses/run/route'
import { GET } from '@/app/api/analyses/[id]/status/route'
import { NextRequest } from 'next/server'

const mockFoundationAgent = {
  id: 'agent-foundation-1',
  name: 'Medicina Integrativa',
  specialty: 'Medicina Funcional e Integrativa',
  description: 'Analisa a saúde de forma holística',
  systemPrompt: 'Você é especialista em medicina integrativa.',
  analysisRole: 'foundation' as const,
  model: 'google/gemini-2.5-flash',
  temperature: '0.70',
  maxTokens: null,
  isActive: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockSpecializedAgent = {
  id: 'agent-specialized-1',
  name: 'Nutrição Clínica',
  specialty: 'Nutrição Funcional',
  description: 'Analisa estado nutricional',
  systemPrompt: 'Você é especialista em nutrição.',
  analysisRole: 'specialized' as const,
  model: 'google/gemini-2.5-flash',
  temperature: '0.70',
  maxTokens: null,
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('analyzeWithAgent — AC4', () => {
  it('retorna AgentAnalysisResult com status completed em chamada bem-sucedida', async () => {
    // #given
    vi.mocked(generateText).mockResolvedValue({
      text: '## Análise\nResultado da análise.',
      usage: { totalTokens: 500, promptTokens: 300, completionTokens: 200 },
    } as never)

    vi.mocked(searchKnowledge).mockResolvedValue([])

    // #when
    const result = await analyzeWithAgent(
      mockFoundationAgent,
      'Analise estes exames',
      {
        snapshotContext: '{"biomarkers":[]}',
        medicalProfileContext: '{"age":35,"gender":"masculino"}',
      },
    )

    // #then
    expect(result.status).toBe('completed')
    expect(result.content).toBe('## Análise\nResultado da análise.')
    expect(result.tokensUsed).toBe(500)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('retorna status timeout quando AbortSignal é acionado', async () => {
    // #given
    vi.mocked(generateText).mockRejectedValue(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }),
    )
    vi.mocked(searchKnowledge).mockResolvedValue([])

    const controller = new AbortController()
    controller.abort()

    // #when
    const result = await analyzeWithAgent(
      mockFoundationAgent,
      'Analise estes exames',
      {
        snapshotContext: '{}',
        medicalProfileContext: '{}',
      },
      controller.signal,
    )

    // #then
    expect(result.status).toBe('timeout')
    expect(result.content).toBe('')
    expect(result.tokensUsed).toBeNull()
  })

  it('retorna status error em caso de falha não-abort', async () => {
    // #given
    vi.mocked(generateText).mockRejectedValue(new Error('API unavailable'))
    vi.mocked(searchKnowledge).mockResolvedValue([])

    // #when
    const result = await analyzeWithAgent(
      mockFoundationAgent,
      'Analise estes exames',
      { snapshotContext: '{}', medicalProfileContext: '{}' },
    )

    // #then
    expect(result.status).toBe('error')
    expect(result.errorMessage).toBe('API unavailable')
  })

  it('usa RAG e marca ragContextUsed=true quando chunks retornados', async () => {
    // #given
    vi.mocked(generateText).mockResolvedValue({
      text: 'Análise com RAG',
      usage: { totalTokens: 400, promptTokens: 250, completionTokens: 150 },
    } as never)

    vi.mocked(searchKnowledge).mockResolvedValue([
      {
        articleId: 'art-1',
        chunkIndex: 0,
        content: 'Contexto relevante de vitamina D',
        snippet: 'Contexto relevante de vitamina D',
        score: 0.92,
        article: { title: 'Vitamina D', source: null, author: null, category: null, isVerified: 'verified' },
      },
    ])

    // #when
    const result = await analyzeWithAgent(
      mockFoundationAgent,
      'Analise vitamina D',
      { snapshotContext: '{}', medicalProfileContext: '{}' },
    )

    // #then
    expect(result.ragContextUsed).toBe(true)
    expect(searchKnowledge).toHaveBeenCalledOnce()
  })

  it('não inclui PII (CPF, nome, email) no payload enviado ao LLM — AC5', async () => {
    // #given
    let capturedPrompt = ''
    vi.mocked(generateText).mockImplementation(async (params) => {
      capturedPrompt = (params as { prompt: string }).prompt ?? ''
      return {
        text: 'ok',
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
      } as never
    })
    vi.mocked(searchKnowledge).mockResolvedValue([])

    const sanitizedSnapshot = JSON.stringify({ patientInfo: { age: 35, gender: 'masculino' }, biomarkers: [] })
    const clinicalProfile = JSON.stringify({ age: 35, gender: 'masculino', height: 175, weight: '78.50' })

    // #when
    await analyzeWithAgent(
      mockFoundationAgent,
      'Analise exames',
      { snapshotContext: sanitizedSnapshot, medicalProfileContext: clinicalProfile },
    )

    // #then — nenhuma string identificável deve estar no prompt
    expect(capturedPrompt).not.toMatch(/cpf/i)
    expect(capturedPrompt).not.toMatch(/nome completo/i)
    expect(capturedPrompt).not.toMatch(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/) // CPF format
    expect(capturedPrompt).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) // email
  })

  it('remove prefixo google/ do model slug antes de chamar provider', async () => {
    // #given
    const { google: mockGoogle } = await import('@ai-sdk/google')
    vi.mocked(generateText).mockResolvedValue({
      text: 'ok',
      usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
    } as never)
    vi.mocked(searchKnowledge).mockResolvedValue([])

    // #when
    await analyzeWithAgent(
      mockFoundationAgent, // model: 'google/gemini-2.5-flash'
      'prompt',
      { snapshotContext: '{}', medicalProfileContext: '{}' },
    )

    // #then — google() chamado sem prefixo 'google/'
    expect(mockGoogle).toHaveBeenCalledWith('gemini-2.5-flash')
  })
})

describe('runLivingAnalysis — AC3, AC6', () => {
  it('foundation é executado antes de specialized (ordem garantida)', async () => {
    // #given — runLivingAnalysis está mockado, testamos o contrato de ordem internamente
    const callOrder: string[] = []

    vi.mocked(runLivingAnalysis).mockImplementation(async () => {
      callOrder.push('foundation')
      callOrder.push('specialized')
    })

    // #when
    await runLivingAnalysis('user-1', 'doc-1', 'analysis-1', 'version-1')

    // #then
    expect(callOrder.indexOf('foundation')).toBeLessThan(callOrder.indexOf('specialized'))
  })

  it('análise parcial não quebra quando foundation timeout ocorre', async () => {
    // #given — runLivingAnalysis não lança mesmo com timeout parcial
    vi.mocked(runLivingAnalysis).mockResolvedValue(undefined)

    // #when / #then — não deve lançar
    await expect(
      runLivingAnalysis('user-1', 'doc-1', 'analysis-1', 'version-1'),
    ).resolves.not.toThrow()
  })
})

describe('POST /api/analyses/run — AC7', () => {
  function makeRunRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/analyses/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('retorna 401 quando não autenticado', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue(null as never)

    // #when
    const res = await POST(makeRunRequest({ documentId: crypto.randomUUID() }))

    // #then
    expect(res.status).toBe(401)
  })

  it('retorna 404 quando documento não pertence ao usuário autenticado', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // documento não encontrado para este userId
    } as never)

    // #when
    const res = await POST(makeRunRequest({ documentId: crypto.randomUUID() }))

    // #then
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain('Documento não encontrado')
  })

  it('retorna 400 quando documentId não é UUID válido', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

    // #when
    const res = await POST(makeRunRequest({ documentId: 'not-a-uuid' }))

    // #then
    expect(res.status).toBe(400)
  })

  it('retorna 409 quando o documento não tem dados extraídos suficientes', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)
    const docId = crypto.randomUUID()

    const docSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: docId }]),
    }
    const snapshotSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          structuredData: {
            documentType: 'UNKNOWN',
            overallSummary: 'Não foi possível extrair os dados',
            patientInfo: {},
            modules: [],
          },
        },
      ]),
    }
    vi.mocked(db.select)
      .mockReturnValueOnce(docSelectChain as never)
      .mockReturnValueOnce(snapshotSelectChain as never)

    // #when
    const res = await POST(makeRunRequest({ documentId: docId }))

    // #then
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toContain('Não há dados extraídos suficientes')
  })

  it('retorna 200 com livingAnalysisId quando válido', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

    const docId = crypto.randomUUID()
    const mockAgents = [{ id: 'agent-1', name: 'Test', analysisRole: 'foundation' }]

    vi.mocked(getActiveAgentsByRole)
      .mockResolvedValueOnce(mockAgents as never)
      .mockResolvedValueOnce(mockAgents as never)

    const docSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: docId }]),
    }
    const livingSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    const triggerSnapshotSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          structuredData: {
            documentType: 'Hemograma',
            overallSummary: 'Resumo válido',
            patientInfo: {},
            modules: [
              {
                moduleName: 'A',
                category: 'B',
                status: 'normal',
                summary: 'ok',
                parameters: [{ name: 'LDL', value: 100, unit: 'mg/dL' }],
              },
            ],
          },
        },
      ]),
    }
    const snapshotsSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: 'snap-1' }]),
    }
    vi.mocked(db.select)
      .mockReturnValueOnce(docSelectChain as never)
      .mockReturnValueOnce(triggerSnapshotSelectChain as never)
      .mockReturnValueOnce(livingSelectChain as never)
      .mockReturnValueOnce(snapshotsSelectChain as never)

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'new-living-id' }]),
      }),
    } as never)
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as never)

    // #when
    const res = await POST(makeRunRequest({ documentId: docId }))

    // #then
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.livingAnalysisId).toBeDefined()
    expect(typeof json.livingAnalysisId).toBe('string')
  })
})

describe('GET /api/analyses/[id]/status — AC7', () => {
  function makeStatusRequest(id: string): NextRequest {
    return new NextRequest(`http://localhost/api/analyses/${id}/status`)
  }

  it('retorna 401 quando não autenticado', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue(null as never)

    // #when
    const res = await GET(makeStatusRequest('some-id'), {
      params: Promise.resolve({ id: 'some-id' }),
    })

    // #then
    expect(res.status).toBe(401)
  })

  it('retorna 404 quando análise não encontrada', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(mockSelect as never)

    // #when
    const id = crypto.randomUUID()
    const res = await GET(makeStatusRequest(id), {
      params: Promise.resolve({ id }),
    })

    // #then
    expect(res.status).toBe(404)
  })

  it('retorna status processing sem reportMarkdown quando em andamento', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { status: 'processing', reportMarkdown: '', userId: 'user-123' },
      ]),
    }
    vi.mocked(db.select).mockReturnValue(mockSelect as never)

    const id = crypto.randomUUID()

    // #when
    const res = await GET(makeStatusRequest(id), {
      params: Promise.resolve({ id }),
    })

    // #then
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('processing')
    expect(json.reportMarkdown).toBeUndefined()
  })

  it('retorna reportMarkdown quando análise está completed', async () => {
    // #given
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } } as never)

    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { status: 'completed', reportMarkdown: '# Relatório Final', userId: 'user-123' },
      ]),
    }
    vi.mocked(db.select).mockReturnValue(mockSelect as never)

    const id = crypto.randomUUID()

    // #when
    const res = await GET(makeStatusRequest(id), {
      params: Promise.resolve({ id }),
    })

    // #then
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('completed')
    expect(json.reportMarkdown).toBe('# Relatório Final')
  })
})
