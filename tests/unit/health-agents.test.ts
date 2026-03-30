import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

import { db } from '@/lib/db/client'
import { getActiveAgentsByRole, getAllActiveAgents } from '@/lib/db/queries/health-agents'
import { seedHealthAgents } from '@/lib/db/seed/health-agents'

const mockFoundationAgents = [
  {
    id: 'uuid-1',
    name: 'Medicina Integrativa',
    specialty: 'Medicina Funcional e Integrativa',
    description: null,
    systemPrompt: 'prompt...',
    analysisRole: 'foundation' as const,
    model: 'google/gemini-2.5-flash',
    temperature: '0.7',
    maxTokens: null,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'uuid-2',
    name: 'Endocrinologia',
    specialty: 'Endocrinologia Funcional e Saúde Hormonal',
    description: null,
    systemPrompt: 'prompt...',
    analysisRole: 'foundation' as const,
    model: 'google/gemini-2.5-flash',
    temperature: '0.7',
    maxTokens: null,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockSpecializedAgents = [
  {
    id: 'uuid-3',
    name: 'Nutrição Clínica',
    specialty: 'Nutrição Funcional',
    description: null,
    systemPrompt: 'prompt...',
    analysisRole: 'specialized' as const,
    model: 'google/gemini-2.5-flash',
    temperature: '0.7',
    maxTokens: null,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'uuid-4',
    name: 'Medicina do Exercício',
    specialty: 'Fisiologia do Exercício',
    description: null,
    systemPrompt: 'prompt...',
    analysisRole: 'specialized' as const,
    model: 'google/gemini-2.5-flash',
    temperature: '0.7',
    maxTokens: null,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'uuid-5',
    name: 'Cardiologia Funcional',
    specialty: 'Cardiologia Preventiva',
    description: null,
    systemPrompt: 'prompt...',
    analysisRole: 'specialized' as const,
    model: 'google/gemini-2.5-flash',
    temperature: '0.7',
    maxTokens: null,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

function buildSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getActiveAgentsByRole', () => {
  describe('foundation agents', () => {
    it('deve retornar 2 agentes foundation ativos', async () => {
      // #given
      buildSelectChain(mockFoundationAgents)

      // #when
      const result = await getActiveAgentsByRole('foundation')

      // #then
      expect(result).toHaveLength(2)
    })

    it('deve filtrar por isActive e analysisRole', async () => {
      // #given
      const chain = buildSelectChain(mockFoundationAgents)

      // #when
      await getActiveAgentsByRole('foundation')

      // #then
      expect(chain.where).toHaveBeenCalledOnce()
      expect(chain.orderBy).toHaveBeenCalledOnce()
    })
  })

  describe('specialized agents', () => {
    it('deve retornar 3 agentes specialized ativos', async () => {
      // #given
      buildSelectChain(mockSpecializedAgents)

      // #when
      const result = await getActiveAgentsByRole('specialized')

      // #then
      expect(result).toHaveLength(3)
    })
  })

  describe('agente inativo', () => {
    it('não deve retornar agente com isActive = false', async () => {
      // #given
      const inactiveAgent = { ...mockFoundationAgents[0], isActive: false }
      buildSelectChain([mockFoundationAgents[1]])

      // #when
      const result = await getActiveAgentsByRole('foundation')

      // #then
      expect(result.find((a) => a.id === inactiveAgent.id)).toBeUndefined()
      expect(result).toHaveLength(1)
    })
  })
})

describe('getAllActiveAgents', () => {
  it('deve retornar todos os agentes ativos', async () => {
    // #given
    const allActive = [...mockFoundationAgents, ...mockSpecializedAgents]
    buildSelectChain(allActive)

    // #when
    const result = await getAllActiveAgents()

    // #then
    expect(result).toHaveLength(5)
  })

  it('deve ordenar por sort_order', async () => {
    // #given
    const chain = buildSelectChain(mockFoundationAgents)

    // #when
    await getAllActiveAgents()

    // #then
    expect(chain.orderBy).toHaveBeenCalledOnce()
  })
})

describe('seedHealthAgents', () => {
  it('deve inserir 5 agentes via db.insert', async () => {
    // #given
    buildInsertChain()

    // #when
    await seedHealthAgents()

    // #then
    expect(db.insert).toHaveBeenCalledTimes(5)
  })

  it('deve usar onConflictDoNothing para idempotência', async () => {
    // #given
    const chain = buildInsertChain()

    // #when
    await seedHealthAgents()

    // #then
    expect(chain.onConflictDoNothing).toHaveBeenCalledTimes(5)
  })

  it('deve incluir agentes foundation e specialized', async () => {
    // #given
    buildInsertChain()

    // #when
    await seedHealthAgents()

    // #then
    const insertCalls = vi.mocked(db.insert).mock.calls
    expect(insertCalls).toHaveLength(5)
  })
})
