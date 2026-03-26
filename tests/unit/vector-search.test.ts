import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('ai', () => ({
  embed: vi.fn(),
}))

vi.mock('@ai-sdk/google', () => ({
  google: {
    textEmbeddingModel: vi.fn().mockReturnValue('mock-embedding-model'),
  },
}))

import { db } from '@/lib/db/client'
import { embed } from 'ai'
import { searchKnowledge, incrementUsageCount } from '@/lib/ai/rag/vector-search'

const mockQueryVector = Array.from({ length: 768 }, (_, i) => i * 0.001)

const mockRows = [
  {
    articleId: 'article-1',
    chunkIndex: 0,
    content: 'Vitamina D3 melhora absorção com TCM',
    score: 0.92,
    title: 'Otimização de Vitamina D3',
    source: 'Dra. Kátia Haranaka',
    author: 'Dra. Katia Haranaka',
    category: 'Nutrição e Metabolismo',
    isVerified: 'verified',
  },
  {
    articleId: 'article-2',
    chunkIndex: 1,
    content: 'Polimorfismo MTRR reduz eficiência de B12',
    score: 0.78,
    title: 'Polimorfismo Genético B12',
    source: 'Dra. Kátia Haranaka',
    author: 'Dra. Katia Haranaka',
    category: 'Genética/Metabolismo',
    isVerified: 'verified',
  },
  {
    articleId: 'article-3',
    chunkIndex: 0,
    content: 'Cálcio e magnésio para saúde óssea',
    score: 0.65,
    title: 'Sinergia Mineral',
    source: null,
    author: null,
    category: 'Nutrição e Metabolismo',
    isVerified: 'unverified',
  },
]

function buildSelectChain(rows: typeof mockRows) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
  vi.mocked(db.select).mockReturnValue(chain as never)
  return chain
}

function buildUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(db.update).mockReturnValue(chain as never)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(embed).mockResolvedValue({ embedding: mockQueryVector } as never)
})

describe('searchKnowledge', () => {
  describe('busca retorna chunks ordenados por score decrescente', () => {
    it('deve retornar chunks com score em ordem decrescente', async () => {
      // #given
      buildSelectChain(mockRows)

      // #when
      const results = await searchKnowledge('vitamina absorção')

      // #then
      expect(results).toHaveLength(3)
      expect(results[0].score).toBeGreaterThan(results[1].score)
      expect(results[1].score).toBeGreaterThan(results[2].score)
    })

    it('deve mapear campos do chunk corretamente', async () => {
      // #given
      buildSelectChain([mockRows[0]])

      // #when
      const results = await searchKnowledge('vitamina D3')

      // #then
      expect(results[0]).toEqual({
        articleId: 'article-1',
        chunkIndex: 0,
        content: 'Vitamina D3 melhora absorção com TCM',
        score: 0.92,
        article: {
          title: 'Otimização de Vitamina D3',
          source: 'Dra. Kátia Haranaka',
          author: 'Dra. Katia Haranaka',
          category: 'Nutrição e Metabolismo',
          isVerified: 'verified',
        },
      })
    })

    it('deve gerar embedding da query antes de buscar', async () => {
      // #given
      buildSelectChain(mockRows)

      // #when
      await searchKnowledge('magnésio ossos', 3)

      // #then
      expect(embed).toHaveBeenCalledOnce()
      expect(embed).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'magnésio ossos' }),
      )
    })

    it('deve respeitar topK passado como argumento', async () => {
      // #given
      const chain = buildSelectChain(mockRows.slice(0, 2))

      // #when
      await searchKnowledge('proteína', 2)

      // #then
      expect(chain.limit).toHaveBeenCalledWith(2)
    })
  })

  describe('query sem match retorna array vazio', () => {
    it('deve retornar [] quando não há resultados', async () => {
      // #given
      buildSelectChain([])

      // #when
      const results = await searchKnowledge('xyzabc consulta sem match')

      // #then
      expect(results).toEqual([])
    })
  })
})

describe('incrementUsageCount', () => {
  it('deve incrementar usage_count atomicamente', async () => {
    // #given
    const chain = buildUpdateChain()

    // #when
    await incrementUsageCount('article-1')

    // #then
    expect(db.update).toHaveBeenCalledOnce()
    expect(chain.set).toHaveBeenCalledOnce()
    expect(chain.where).toHaveBeenCalledOnce()
  })

  it('deve atualizar last_analyzed_at junto com usage_count', async () => {
    // #given
    const chain = buildUpdateChain()

    // #when
    await incrementUsageCount('article-42')

    // #then
    const setCall = chain.set.mock.calls[0][0]
    expect(setCall).toHaveProperty('usageCount')
    expect(setCall).toHaveProperty('lastAnalyzedAt')
    expect(setCall.lastAnalyzedAt).toBeInstanceOf(Date)
  })
})
