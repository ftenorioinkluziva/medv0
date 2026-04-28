import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}))

vi.mock('@/lib/db/queries/health-agents', () => ({
  getActiveAgentsByRole: vi.fn(),
}))

vi.mock('@/lib/ai/agents/analyze', () => ({
  analyzeWithAgent: vi.fn(),
}))

vi.mock('@/lib/ai/utils/validate-report-sections', () => ({
  validateReportSections: vi.fn(),
}))

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('@/lib/ai/core/resolve-model', () => ({
  resolveModel: vi.fn(() => 'mock-resolved-model'),
}))

import { db } from '@/lib/db/client'
import { generateText } from 'ai'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'
import { analyzeWithAgent } from '@/lib/ai/agents/analyze'
import { validateReportSections } from '@/lib/ai/utils/validate-report-sections'
import { resolveModel } from '@/lib/ai/core/resolve-model'
import { runCompleteAnalysis } from '@/lib/ai/orchestrator/complete-analysis'

const foundationAgent = {
  id: 'foundation-1',
  name: 'Foundation Agent',
  specialty: 'foundation',
  description: null,
  systemPrompt: 'foundation prompt',
      chatPrompt: null,
  analysisRole: 'foundation' as const,
  model: 'google/gemini-2.5-flash',
  temperature: '0.7',
  maxTokens: null,
  isActive: true,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const specializedAgent = {
  id: 'specialized-1',
  name: 'Specialized Agent',
  specialty: 'specialized',
  description: null,
  systemPrompt: 'specialized prompt',
      chatPrompt: null,
  analysisRole: 'specialized' as const,
  model: 'google/gemini-2.5-flash',
  temperature: '0.7',
  maxTokens: null,
  isActive: true,
  sortOrder: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function createSelectChain(result: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runCompleteAnalysis', () => {
  it('executes foundation and specialized phases and persists outputs', async () => {
    // #given
    const updateWhere = vi.fn().mockResolvedValue(undefined)
    const setMock = vi.fn().mockReturnValue({ where: updateWhere })
    vi.mocked(db.update).mockReturnValue({ set: setMock } as never)

    const insertValues = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.insert).mockReturnValue({ values: insertValues } as never)

    vi.mocked(db.select)
      .mockReturnValueOnce(createSelectChain([{ structuredData: { glucose: { value: 99 } } }]) as never)
      .mockReturnValueOnce(createSelectChain([{ age: 42, healthObjectives: 'improve sleep' }]) as never)
      .mockReturnValueOnce(createSelectChain([]) as never)
      .mockReturnValueOnce(createSelectChain([]) as never)

    vi.mocked(getActiveAgentsByRole)
      .mockResolvedValueOnce([foundationAgent] as never)
      .mockResolvedValueOnce([specializedAgent] as never)

    vi.mocked(analyzeWithAgent)
      .mockResolvedValueOnce({
        content: 'Foundation output: análise integrativa completa com todos os parâmetros avaliados e recomendações detalhadas pelo agente de fundação.',
        ragContextUsed: false,
        tokensUsed: 100,
        durationMs: 20,
        status: 'completed',
      })
      .mockResolvedValueOnce({
        content: 'Specialized output: análise especializada completa com todos os parâmetros avaliados e recomendações detalhadas pelo agente especializado.',
        ragContextUsed: true,
        tokensUsed: 120,
        durationMs: 30,
        status: 'completed',
      })

    vi.mocked(generateText).mockResolvedValue({ text: 'Synthesis output' } as never)

    // #when
    await runCompleteAnalysis('user-1', 'document-1', 'complete-1')

    // #then
    expect(getActiveAgentsByRole).toHaveBeenNthCalledWith(1, 'foundation')
    expect(getActiveAgentsByRole).toHaveBeenNthCalledWith(2, 'specialized')
    expect(analyzeWithAgent).toHaveBeenCalledTimes(2)
    expect(analyzeWithAgent).toHaveBeenNthCalledWith(
      2,
      specializedAgent,
      expect.any(String),
      expect.objectContaining({ foundationContext: expect.stringContaining('Foundation output') }),
      expect.any(AbortSignal),
    )
    expect(insertValues).toHaveBeenCalledTimes(2)
    expect(setMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: 'processing' }))
    expect(setMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'completed',
        agentsCount: 2,
        foundationCompleted: 1,
        specializedCompleted: 1,
      }),
    )
    expect(validateReportSections).toHaveBeenCalledWith(expect.stringContaining('Synthesis output'))
    expect(resolveModel).toHaveBeenCalledWith('google/gemini-2.5-flash')
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'mock-resolved-model' }),
    )
  })
})
