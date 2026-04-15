import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    user: { id: 'admin-1', role: 'admin', email: 'admin@test.com', name: 'Admin', onboardingCompleted: true },
  }),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db/queries/health-agents', () => ({
  getAgentById: vi.fn(),
  countActiveFoundationAgents: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { db } from '@/lib/db/client'
import {
  getAgentById,
  countActiveFoundationAgents,
} from '@/lib/db/queries/health-agents'
import {
  createAgentAction,
  updateAgentAction,
  toggleAgentAction,
  deleteAgentAction,
} from '@/app/admin/agents/_actions/agents'
import type { HealthAgent } from '@/lib/db/schema'

const LONG_PROMPT = 'A'.repeat(60)

const mockFoundationAgent: HealthAgent = {
  id: 'agent-1',
  name: 'Medicina Integrativa',
  specialty: 'Medicina Funcional',
  description: null,
  systemPrompt: LONG_PROMPT,
  analysisRole: 'foundation',
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

const mockSpecializedAgent: HealthAgent = {
  ...mockFoundationAgent,
  id: 'agent-2',
  name: 'Nutrição Clínica',
  analysisRole: 'specialized',
}

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  const defaults: Record<string, string> = {
    name: 'Teste',
    specialty: 'Especialidade Teste',
    systemPrompt: LONG_PROMPT,
    analysisRole: 'specialized',
    model: 'google/gemini-2.5-flash',
    temperature: '0.7',
    sortOrder: '0',
    isActive: 'on',
  }
  for (const [k, v] of Object.entries({ ...defaults, ...overrides })) {
    fd.set(k, v)
  }
  return fd
}

function makeChain() {
  const chain = {
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  })
  ;(db.insert as ReturnType<typeof vi.fn>).mockReturnValue(makeChain())
  ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue(makeChain())
  ;(db.delete as ReturnType<typeof vi.fn>).mockReturnValue(makeChain())
})

describe('createAgentAction', () => {
  it('retorna erro quando systemPrompt tem menos de 50 chars', async () => {
    // #given
    const fd = makeFormData({ systemPrompt: 'curto demais' })

    // #when
    const result = await createAgentAction(fd)

    // #then
    expect(result).toEqual({ error: 'System prompt deve ter no mínimo 50 caracteres' })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('insere agente quando dados são válidos', async () => {
    // #given
    const fd = makeFormData()

    // #when
    await createAgentAction(fd)

    // #then
    expect(db.insert).toHaveBeenCalled()
  })
})

describe('toggleAgentAction', () => {
  it('bloqueia desativação do único foundation agent ativo', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFoundationAgent)
    ;(countActiveFoundationAgents as ReturnType<typeof vi.fn>).mockResolvedValue(1)

    // #when
    const result = await toggleAgentAction('agent-1', true)

    // #then
    expect(result).toEqual({ error: 'Pelo menos 1 agente foundation deve estar ativo' })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('permite desativar foundation quando há mais de um ativo', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFoundationAgent)
    ;(countActiveFoundationAgents as ReturnType<typeof vi.fn>).mockResolvedValue(2)

    // #when
    const result = await toggleAgentAction('agent-1', true)

    // #then
    expect(result).toEqual({ success: true })
    expect(db.update).toHaveBeenCalled()
  })

  it('permite toggle de specialized sem restrições', async () => {
    // #given — specialized não consulta countActiveFoundationAgents
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockSpecializedAgent)

    // #when
    const result = await toggleAgentAction('agent-2', true)

    // #then
    expect(result).toEqual({ success: true })
    expect(db.update).toHaveBeenCalled()
    expect(countActiveFoundationAgents).not.toHaveBeenCalled()
  })

  it('ativa agente inativo diretamente sem verificar foundation count', async () => {
    // #given — currentlyActive = false → não consulta DB para verificar
    // #when
    const result = await toggleAgentAction('agent-1', false)

    // #then
    expect(result).toEqual({ success: true })
    expect(getAgentById).not.toHaveBeenCalled()
    expect(db.update).toHaveBeenCalled()
  })
})

describe('updateAgentAction', () => {
  it('retorna erro quando agente não existe', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    // #when
    const result = await updateAgentAction('nonexistent', makeFormData())

    // #then
    expect(result).toEqual({ error: 'Agente não encontrado' })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('retorna erro para dados inválidos (systemPrompt curto)', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockSpecializedAgent)
    const fd = makeFormData({ systemPrompt: 'curto demais' })

    // #when
    const result = await updateAgentAction('agent-2', fd)

    // #then
    expect(result).toEqual({ error: 'System prompt deve ter no mínimo 50 caracteres' })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('atualiza agente com dados válidos', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockSpecializedAgent)

    // #when
    await updateAgentAction('agent-2', makeFormData({ name: 'Atualizado' }))

    // #then
    expect(db.update).toHaveBeenCalled()
  })

  it('bloqueia alteração de role do único foundation ativo', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFoundationAgent)
    ;(countActiveFoundationAgents as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    const fd = makeFormData({ analysisRole: 'specialized' })

    // #when
    const result = await updateAgentAction('agent-1', fd)

    // #then
    expect(result).toEqual({
      error:
        'Pelo menos 1 agente foundation deve estar ativo. Não é possível alterar o role do único foundation ativo.',
    })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('bloqueia desativação do único foundation ativo via isActive=false', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFoundationAgent)
    ;(countActiveFoundationAgents as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    const fd = makeFormData({ analysisRole: 'foundation' })
    fd.delete('isActive') // sem isActive = checkbox desmarcado = false

    // #when
    const result = await updateAgentAction('agent-1', fd)

    // #then
    expect(result).toEqual({
      error:
        'Pelo menos 1 agente foundation deve estar ativo. Não é possível alterar o role do único foundation ativo.',
    })
    expect(db.update).not.toHaveBeenCalled()
  })

  it('permite alterar role quando há múltiplos foundations ativos', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFoundationAgent)
    ;(countActiveFoundationAgents as ReturnType<typeof vi.fn>).mockResolvedValue(2)
    const fd = makeFormData({ analysisRole: 'specialized' })

    // #when
    await updateAgentAction('agent-1', fd)

    // #then
    expect(db.update).toHaveBeenCalled()
  })
})

describe('deleteAgentAction', () => {
  it('bloqueia exclusão do único foundation agent ativo', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFoundationAgent)
    ;(countActiveFoundationAgents as ReturnType<typeof vi.fn>).mockResolvedValue(1)

    // #when
    const result = await deleteAgentAction('agent-1')

    // #then
    expect(result).toEqual({
      error:
        'Pelo menos 1 agente foundation deve estar ativo. Não é possível excluir o único foundation ativo.',
    })
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('permite excluir foundation quando há mais de um ativo', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFoundationAgent)
    ;(countActiveFoundationAgents as ReturnType<typeof vi.fn>).mockResolvedValue(2)

    // #when
    const result = await deleteAgentAction('agent-1')

    // #then
    expect(result).toEqual({ success: true })
    expect(db.delete).toHaveBeenCalled()
  })

  it('bloqueia exclusão quando há análises vinculadas ao agente', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(mockSpecializedAgent)
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'analysis-1' }]),
        }),
      }),
    })

    // #when
    const result = await deleteAgentAction('agent-2')

    // #then
    expect(result).toEqual({
      error:
        'Este agente já foi usado em análises e não pode ser excluído. Desative-o para impedir novos usos.',
    })
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('retorna erro quando agente não existe', async () => {
    // #given
    ;(getAgentById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    // #when
    const result = await deleteAgentAction('nonexistent')

    // #then
    expect(result).toEqual({ error: 'Agente não encontrado' })
    expect(db.delete).not.toHaveBeenCalled()
  })
})
