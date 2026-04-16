import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockStreamText = vi.fn()
const mockResolveModel = vi.fn()
const mockSearchKnowledge = vi.fn()
const mockGetSessionWithAgent = vi.fn()
const mockGetChatMessages = vi.fn()

vi.mock('@/lib/auth/config', () => ({
  auth: mockAuth,
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}))

vi.mock('@/lib/db/schema', () => ({
  chatMessages: { id: 'cm.id', sessionId: 'cm.sessionId', role: 'cm.role', createdAt: 'cm.createdAt' },
  chatSessions: { id: 'cs.id', userId: 'cs.userId', agentId: 'cs.agentId', title: 'cs.title' },
  healthAgents: { id: 'ha.id', isActive: 'ha.isActive' },
  livingAnalyses: { userId: 'la.userId', reportMarkdown: 'la.reportMarkdown' },
}))

vi.mock('ai', () => ({
  streamText: mockStreamText,
}))

vi.mock('@/lib/ai/core/resolve-model', () => ({
  resolveModel: mockResolveModel,
}))

vi.mock('@/lib/ai/rag/vector-search', () => ({
  searchKnowledge: mockSearchKnowledge,
}))

vi.mock('@/lib/db/queries/chat', () => ({
  getSessionWithAgent: mockGetSessionWithAgent,
  getChatMessages: mockGetChatMessages,
}))

const { POST } = await import('@/app/api/chat/route')
const { buildChatSystemPrompt } = await import('@/app/api/chat/helpers')

const AGENT_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678'
const SESSION_ID = 'b2c3d4e5-f6a7-4890-9bcd-ef0123456789'
const NEW_SESSION_ID = 'c3d4e5f6-a7b8-4901-abcd-f01234567890'

const AGENT = {
  id: AGENT_ID,
  name: 'Nutrição',
  specialty: 'nutrition',
  description: null,
  systemPrompt: 'Você é um agente de nutrição.',
  analysisRole: 'specialized',
  model: 'google/gemini-2.5-flash',
  temperature: '0.7',
  maxTokens: null,
  modelConfig: null,
  outputSchema: null,
  outputType: 'text',
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const CHAT_MESSAGES = [
  { id: 'm1', sessionId: SESSION_ID, role: 'user', content: 'Oi', tokensUsed: null, createdAt: new Date() },
]

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
}

function makeCountChain(msgCount: number) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ msgCount }]),
  }
  return chain
}

function makeAnalysisChain(reportMarkdown: string | null) {
  const rows = reportMarkdown !== null ? [{ reportMarkdown }] : []
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((fn: (r: unknown[]) => unknown) => Promise.resolve(fn(rows))),
  }
  return chain
}

function makeInsertReturning(returning: unknown[]) {
  return {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returning),
  }
}

function makeInsertValuesOnly() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  }
}

function makeUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  }
}

function setupSelectsForSuccessfulRequest(msgCount = 0, analysis: string | null = null) {
  mockSelect
    .mockReturnValueOnce(makeCountChain(msgCount) as never)
    .mockReturnValueOnce(makeSelectChain([AGENT]) as never)
    .mockReturnValueOnce(makeAnalysisChain(analysis) as never)
}

function setupDefaultMocks() {
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
  mockResolveModel.mockReturnValue('resolved-model')
  mockSearchKnowledge.mockResolvedValue([])
  mockGetChatMessages.mockResolvedValue(CHAT_MESSAGES)
  mockStreamText.mockReturnValue({
    toTextStreamResponse: vi.fn().mockReturnValue(new Response('stream')),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ──────────────────────────────────────────────────────────
// buildChatSystemPrompt — context construction (AC4)
// ──────────────────────────────────────────────────────────

describe('buildChatSystemPrompt', () => {
  it('inclui systemPrompt do agente', () => {
    const prompt = buildChatSystemPrompt('Base prompt.', null, '')
    expect(prompt).toContain('Base prompt.')
  })

  it('inclui disclaimer educacional sempre', () => {
    const prompt = buildChatSystemPrompt('Base.', null, '')
    expect(prompt).toContain('NÃO substitui consulta médica profissional')
  })

  it('inclui conhecimento especializado quando knowledgeContext não vazio', () => {
    // #given
    const knowledge = 'Vitamina D é importante para ossos.'

    // #when
    const prompt = buildChatSystemPrompt('Base.', null, knowledge)

    // #then
    expect(prompt).toContain('## Conhecimento Especializado')
    expect(prompt).toContain(knowledge)
  })

  it('inclui análise quando analysisContext não nulo', () => {
    // #given
    const analysis = 'Paciente com deficiência de vitamina D.'

    // #when
    const prompt = buildChatSystemPrompt('Base.', analysis, '')

    // #then
    expect(prompt).toContain('## Contexto da Última Análise do Paciente')
    expect(prompt).toContain(analysis)
  })

  it('omite seções opcionais quando não fornecidas', () => {
    const prompt = buildChatSystemPrompt('Base.', null, '')
    expect(prompt).not.toContain('## Conhecimento Especializado')
    expect(prompt).not.toContain('## Contexto da Última Análise do Paciente')
  })
})

// ──────────────────────────────────────────────────────────
// POST /api/chat — autenticação
// ──────────────────────────────────────────────────────────

describe('POST /api/chat — autenticação', () => {
  it('retorna 401 quando usuário não autenticado', async () => {
    // #given
    mockAuth.mockResolvedValue(null)

    // #when
    const response = await POST(makeRequest({ sessionId: null, agentId: AGENT_ID, message: 'Oi' }))

    // #then
    expect(response.status).toBe(401)
  })

  it('retorna 400 quando body inválido (JSON malformado)', async () => {
    // #given
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })

    // #when
    const response = await POST(request)

    // #then
    expect(response.status).toBe(400)
  })

  it('retorna 400 quando campos obrigatórios ausentes', async () => {
    // #given
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    // #when
    const response = await POST(makeRequest({ sessionId: null }))

    // #then
    expect(response.status).toBe(400)
  })
})

// ──────────────────────────────────────────────────────────
// POST /api/chat — rate limiting (AC5)
// ──────────────────────────────────────────────────────────

describe('POST /api/chat — rate limiting', () => {
  it('retorna 429 quando limite de 30 mensagens/hora atingido', async () => {
    // #given
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSelect.mockReturnValueOnce(makeCountChain(30) as never)

    // #when
    const response = await POST(makeRequest({ sessionId: null, agentId: AGENT_ID, message: 'Oi' }))
    const json = await response.json()

    // #then
    expect(response.status).toBe(429)
    expect(json.error).toContain('Limite de mensagens atingido')
  })

  it('com 29 mensagens (abaixo do limite) não retorna 429', async () => {
    // #given
    setupDefaultMocks()
    setupSelectsForSuccessfulRequest(29)
    mockInsert
      .mockReturnValueOnce(makeInsertReturning([{ id: NEW_SESSION_ID }]) as never)
      .mockReturnValueOnce(makeInsertValuesOnly() as never)
    mockUpdate.mockReturnValue(makeUpdateChain() as never)

    // #when
    const response = await POST(makeRequest({ sessionId: null, agentId: AGENT_ID, message: 'Oi' }))

    // #then
    expect(response.status).not.toBe(429)
  })
})

// ──────────────────────────────────────────────────────────
// POST /api/chat — ownership validation (AC3)
// ──────────────────────────────────────────────────────────

describe('POST /api/chat — ownership validation', () => {
  it('retorna 404 quando sessão não pertence ao usuário', async () => {
    // #given
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSelect
      .mockReturnValueOnce(makeCountChain(0) as never)
      .mockReturnValueOnce(makeSelectChain([AGENT]) as never)
    mockGetSessionWithAgent.mockResolvedValue({ id: SESSION_ID, userId: 'other-user', agentId: AGENT_ID })

    // #when
    const response = await POST(makeRequest({ sessionId: SESSION_ID, agentId: AGENT_ID, message: 'Oi' }))

    // #then
    expect(response.status).toBe(404)
  })

  it('retorna 404 quando sessão inexistente', async () => {
    // #given
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSelect
      .mockReturnValueOnce(makeCountChain(0) as never)
      .mockReturnValueOnce(makeSelectChain([AGENT]) as never)
    mockGetSessionWithAgent.mockResolvedValue(null)

    // #when
    const response = await POST(makeRequest({ sessionId: SESSION_ID, agentId: AGENT_ID, message: 'Oi' }))

    // #then
    expect(response.status).toBe(404)
  })
})

// ──────────────────────────────────────────────────────────
// POST /api/chat — criação automática de sessão (AC6)
// ──────────────────────────────────────────────────────────

describe('POST /api/chat — criação automática de sessão', () => {
  it('cria nova sessão quando sessionId é null', async () => {
    // #given
    setupDefaultMocks()
    setupSelectsForSuccessfulRequest()
    const insertSession = makeInsertReturning([{ id: NEW_SESSION_ID }])
    mockInsert
      .mockReturnValueOnce(insertSession as never)
      .mockReturnValueOnce(makeInsertValuesOnly() as never)
    mockUpdate.mockReturnValue(makeUpdateChain() as never)

    // #when
    const response = await POST(makeRequest({ sessionId: null, agentId: AGENT_ID, message: 'Preciso de ajuda' }))

    // #then
    expect(insertSession.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        agentId: AGENT_ID,
        title: 'Preciso de ajuda',
      }),
    )
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(404)
  })

  it('title truncado em 50 chars da primeira mensagem', async () => {
    // #given
    setupDefaultMocks()
    setupSelectsForSuccessfulRequest()
    const longMessage = 'A'.repeat(100)
    const insertSession = makeInsertReturning([{ id: NEW_SESSION_ID }])
    mockInsert
      .mockReturnValueOnce(insertSession as never)
      .mockReturnValueOnce(makeInsertValuesOnly() as never)
    mockUpdate.mockReturnValue(makeUpdateChain() as never)

    // #when
    await POST(makeRequest({ sessionId: null, agentId: AGENT_ID, message: longMessage }))

    // #then
    const titleUsed = insertSession.values.mock.calls[0][0].title
    expect(titleUsed).toHaveLength(50)
  })

  it('reutiliza sessão existente quando sessionId fornecido', async () => {
    // #given
    setupDefaultMocks()
    setupSelectsForSuccessfulRequest()
    mockGetSessionWithAgent.mockResolvedValue({
      id: SESSION_ID,
      userId: 'user-1',
      agentId: AGENT_ID,
      agent: AGENT,
    })
    const insertUserMsg = makeInsertValuesOnly()
    mockInsert.mockReturnValueOnce(insertUserMsg as never)
    mockUpdate.mockReturnValue(makeUpdateChain() as never)

    // #when
    await POST(makeRequest({ sessionId: SESSION_ID, agentId: AGENT_ID, message: 'Oi' }))

    // #then — apenas 1 insert (mensagem do user), não cria nova sessão
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(insertUserMsg.values).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: SESSION_ID, role: 'user' }),
    )
  })
})

// ──────────────────────────────────────────────────────────
// POST /api/chat — contexto (AC4)
// ──────────────────────────────────────────────────────────

describe('POST /api/chat — contexto', () => {
  it('chama searchKnowledge com agentId para filtrar RAG', async () => {
    // #given
    setupDefaultMocks()
    setupSelectsForSuccessfulRequest()
    mockInsert
      .mockReturnValueOnce(makeInsertReturning([{ id: NEW_SESSION_ID }]) as never)
      .mockReturnValueOnce(makeInsertValuesOnly() as never)
    mockUpdate.mockReturnValue(makeUpdateChain() as never)

    // #when
    await POST(makeRequest({ sessionId: null, agentId: AGENT_ID, message: 'vitamina D' }))

    // #then
    expect(mockSearchKnowledge).toHaveBeenCalledWith('vitamina D', 3, AGENT_ID)
  })

  it('chama streamText com system, messages e temperature corretos', async () => {
    // #given
    setupDefaultMocks()
    setupSelectsForSuccessfulRequest()
    mockInsert
      .mockReturnValueOnce(makeInsertReturning([{ id: NEW_SESSION_ID }]) as never)
      .mockReturnValueOnce(makeInsertValuesOnly() as never)
    mockUpdate.mockReturnValue(makeUpdateChain() as never)

    // #when
    await POST(makeRequest({ sessionId: null, agentId: AGENT_ID, message: 'Oi' }))

    // #then
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'resolved-model',
        system: expect.stringContaining(AGENT.systemPrompt),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Oi' }),
        ]),
        temperature: 0.7,
      }),
    )
  })

  it('inclui contexto da análise no system prompt quando existir', async () => {
    // #given
    setupDefaultMocks()
    setupSelectsForSuccessfulRequest(0, '## Análise completa\nDeficiência de D3')
    mockInsert
      .mockReturnValueOnce(makeInsertReturning([{ id: NEW_SESSION_ID }]) as never)
      .mockReturnValueOnce(makeInsertValuesOnly() as never)
    mockUpdate.mockReturnValue(makeUpdateChain() as never)

    // #when
    await POST(makeRequest({ sessionId: null, agentId: AGENT_ID, message: 'Como está meu D3?' }))

    // #then
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Deficiência de D3'),
      }),
    )
  })

  it('carrega últimas 20 mensagens da sessão', async () => {
    // #given
    setupDefaultMocks()
    setupSelectsForSuccessfulRequest()
    mockInsert
      .mockReturnValueOnce(makeInsertReturning([{ id: NEW_SESSION_ID }]) as never)
      .mockReturnValueOnce(makeInsertValuesOnly() as never)
    mockUpdate.mockReturnValue(makeUpdateChain() as never)

    // #when
    await POST(makeRequest({ sessionId: null, agentId: AGENT_ID, message: 'Oi' }))

    // #then
    expect(mockGetChatMessages).toHaveBeenCalledWith(NEW_SESSION_ID, 20)
  })
})

// ──────────────────────────────────────────────────────────
// getChatMessages — ordering (AC7)
// ──────────────────────────────────────────────────────────

describe('getChatMessages — ordenação cronológica', () => {
  it('retorna mensagens em ordem cronológica (oldest first) após reverse', async () => {
    // #given — DB retorna mais recente primeiro (orderBy desc), esperamos reverso
    const newerMsg = {
      id: 'm2', sessionId: 's1', role: 'assistant', content: 'Resp',
      tokensUsed: 10, createdAt: new Date(2000),
    }
    const olderMsg = {
      id: 'm1', sessionId: 's1', role: 'user', content: 'Oi',
      tokensUsed: null, createdAt: new Date(1000),
    }

    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([newerMsg, olderMsg]),
    }
    mockSelect.mockReturnValueOnce(chain as never)

    const { getChatMessages: getChatMessagesActual } = await vi.importActual<
      typeof import('@/lib/db/queries/chat')
    >('@/lib/db/queries/chat')

    // #when
    const result = await getChatMessagesActual('s1', 20)

    // #then — reverse garante oldest first
    expect(result[0].id).toBe('m1')
    expect(result[1].id).toBe('m2')
  })
})
