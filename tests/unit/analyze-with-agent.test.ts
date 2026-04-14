import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/ai/core/resolve-model', () => ({
  resolveModel: vi.fn((model: string) => `resolved:${model}`),
}))

vi.mock('@/lib/ai/rag/vector-search', () => ({
  searchKnowledge: vi.fn().mockResolvedValue([]),
}))

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'mock analysis result',
    usage: { totalTokens: 100 },
  }),
}))

import { generateText } from 'ai'
import { resolveModel } from '@/lib/ai/core/resolve-model'
import { analyzeWithAgent } from '@/lib/ai/agents/analyze'
import type { HealthAgent } from '@/lib/db/schema'

const baseAgent: HealthAgent = {
  id: 'agent-1',
  name: 'Test Agent',
  specialty: 'cardiology',
  description: null,
  systemPrompt: 'You are a cardiologist',
  analysisRole: 'specialized',
  model: 'google/gemini-2.5-flash',
  temperature: '0.7',
  maxTokens: null,
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseContext = {
  snapshotContext: '{}',
  medicalProfileContext: '{}',
}

describe('analyzeWithAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC2 — uses resolveModel for provider resolution', () => {
    it('passes agent.model to resolveModel', async () => {
      // #given
      const agent = { ...baseAgent, model: 'google/gemini-2.5-flash' }

      // #when
      await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(resolveModel).toHaveBeenCalledWith('google/gemini-2.5-flash')
    })

    it('passes resolved model to generateText', async () => {
      // #given
      const agent = { ...baseAgent, model: 'openai/gpt-4o' }

      // #when
      await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(resolveModel).toHaveBeenCalledWith('openai/gpt-4o')
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'resolved:openai/gpt-4o' }),
      )
    })

    it('preserves behavior for existing google agents', async () => {
      // #given
      const agent = { ...baseAgent, model: 'google/gemini-2.5-flash' }

      // #when
      const result = await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(result.status).toBe('completed')
      expect(result.content).toBe('mock analysis result')
      expect(result.tokensUsed).toBe(100)
    })
  })
})
