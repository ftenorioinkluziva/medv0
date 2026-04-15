import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('ai', () => ({
  embed: vi.fn(),
  generateText: vi.fn(),
}))

vi.mock('@/lib/ai/rag/vector-search', () => ({
  searchKnowledge: vi.fn(),
}))

vi.mock('@/lib/ai/core/resolve-model', () => ({
  resolveModel: vi.fn().mockReturnValue('mock-model'),
}))

import { db } from '@/lib/db/client'
import { searchKnowledge } from '@/lib/ai/rag/vector-search'
import { analyzeWithAgent } from '@/lib/ai/agents/analyze'
import {
  getArticlesByAgent,
  associateArticleToAgent,
  disassociateArticleFromAgent,
  getAgentsByArticle,
} from '@/lib/db/queries/knowledge'

const mockAgent = {
  id: 'agent-nutricao-uuid',
  name: 'Nutrição',
  specialty: 'nutrição clínica',
  description: null,
  systemPrompt: 'Você é um especialista em nutrição.',
  analysisRole: 'specialized' as const,
  model: 'google/gemini-2.5-flash',
  temperature: '0.7',
  maxTokens: null,
  modelConfig: null,
  outputSchema: null,
  outputType: 'text',
  isActive: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockArticle = {
  id: 'article-dieta-uuid',
  title: 'Dieta Mediterrânea',
  content: 'Conteúdo sobre dieta mediterrânea...',
  summary: null,
  source: null,
  author: null,
  publishedDate: null,
  category: 'Nutrição',
  subcategory: null,
  tags: null,
  language: 'pt-BR',
  isVerified: 'verified',
  isGlobal: false,
  usageCount: 0,
  lastAnalyzedAt: null,
  analysisVersion: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function buildSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
  vi.mocked(db.select).mockReturnValue(chain as never)
  return chain
}

function buildInsertChain() {
  const chain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(db.insert).mockReturnValue(chain as never)
  return chain
}

function buildDeleteChain() {
  const chain = {
    where: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(db.delete).mockReturnValue(chain as never)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── analyzeWithAgent — AC5 ────────────────────────────────────────────────

describe('analyzeWithAgent', () => {
  it('deve passar agent.id ao searchKnowledge para filtrar RAG por agente', async () => {
    // #given
    vi.mocked(searchKnowledge).mockResolvedValue([])
    const { generateText } = await import('ai')
    vi.mocked(generateText).mockResolvedValue({ text: 'análise', usage: { totalTokens: 100 } } as never)

    // #when
    await analyzeWithAgent(
      mockAgent,
      'Analise os dados',
      { snapshotContext: '{}', medicalProfileContext: '{}' },
    )

    // #then
    expect(searchKnowledge).toHaveBeenCalledWith(
      expect.any(String),
      8,
      'agent-nutricao-uuid',
    )
  })

  it('não deve chamar searchKnowledge quando knowledgeContext já foi fornecido', async () => {
    // #given
    const { generateText } = await import('ai')
    vi.mocked(generateText).mockResolvedValue({ text: 'análise', usage: { totalTokens: 50 } } as never)

    // #when
    await analyzeWithAgent(
      mockAgent,
      'Analise os dados',
      { snapshotContext: '{}', medicalProfileContext: '{}', knowledgeContext: 'contexto pré-carregado' },
    )

    // #then
    expect(searchKnowledge).not.toHaveBeenCalled()
  })
})

// ─── Queries helper — AC4 ─────────────────────────────────────────────────

describe('getArticlesByAgent', () => {
  it('deve retornar artigos associados ao agente via join', async () => {
    // #given
    const chain = buildSelectChain([{ article: mockArticle }])

    // #when
    const result = await getArticlesByAgent('agent-nutricao-uuid')

    // #then
    expect(db.select).toHaveBeenCalledOnce()
    expect(chain.from).toHaveBeenCalledOnce()
    expect(chain.innerJoin).toHaveBeenCalledOnce()
    expect(chain.where).toHaveBeenCalledOnce()
    expect(result).toEqual([mockArticle])
  })

  it('deve retornar array vazio quando agente não tem artigos associados', async () => {
    // #given
    buildSelectChain([])

    // #when
    const result = await getArticlesByAgent('agent-sem-artigos-uuid')

    // #then
    expect(result).toEqual([])
  })
})

describe('associateArticleToAgent', () => {
  it('deve inserir associação na tabela agent_knowledge com onConflictDoNothing', async () => {
    // #given
    const chain = buildInsertChain()

    // #when
    await associateArticleToAgent('agent-nutricao-uuid', 'article-dieta-uuid')

    // #then
    expect(db.insert).toHaveBeenCalledOnce()
    expect(chain.values).toHaveBeenCalledWith({
      agentId: 'agent-nutricao-uuid',
      articleId: 'article-dieta-uuid',
    })
    expect(chain.onConflictDoNothing).toHaveBeenCalledOnce()
  })
})

describe('disassociateArticleFromAgent', () => {
  it('deve deletar associação da tabela agent_knowledge', async () => {
    // #given
    const chain = buildDeleteChain()

    // #when
    await disassociateArticleFromAgent('agent-nutricao-uuid', 'article-dieta-uuid')

    // #then
    expect(db.delete).toHaveBeenCalledOnce()
    expect(chain.where).toHaveBeenCalledOnce()
  })
})

describe('getAgentsByArticle', () => {
  it('deve retornar agentes associados ao artigo via join', async () => {
    // #given
    buildSelectChain([{ agent: mockAgent }])

    // #when
    const result = await getAgentsByArticle('article-dieta-uuid')

    // #then
    expect(result).toEqual([mockAgent])
  })

  it('deve retornar array vazio quando artigo não tem agentes associados', async () => {
    // #given
    buildSelectChain([])

    // #when
    const result = await getAgentsByArticle('article-sem-agentes-uuid')

    // #then
    expect(result).toEqual([])
  })
})

// ─── Schema — AC1: unique constraint (behavioral via insert mock) ──────────

describe('agent_knowledge unique constraint', () => {
  it('deve ignorar inserção duplicada silenciosamente via onConflictDoNothing', async () => {
    // #given — onConflictDoNothing absorbs the duplicate; no error propagated
    buildInsertChain()

    // #when / #then — resolves without throwing (Story 8.2: onConflictDoNothing added)
    await expect(
      associateArticleToAgent('agent-nutricao-uuid', 'article-dieta-uuid'),
    ).resolves.toBeUndefined()
  })
})
