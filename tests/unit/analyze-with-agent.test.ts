import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/ai/core/resolve-model', () => ({
  resolveModel: vi.fn((model: string) => `resolved:${model}`),
}))

vi.mock('@/lib/ai/rag/vector-search', () => ({
  searchKnowledge: vi.fn().mockResolvedValue([]),
}))

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'Mock analysis result. Mock analysis result. Mock analysis result. Mock analysis result. Mock analysis result. Mock analysis result.',
    usage: { totalTokens: 100 },
  }),
  generateObject: vi.fn().mockResolvedValue({
    object: { summary: 'structured result' },
    usage: { totalTokens: 150 },
  }),
  jsonSchema: vi.fn((schema: unknown) => schema),
}))

import { generateText, generateObject } from 'ai'
import { resolveModel } from '@/lib/ai/core/resolve-model'
import { analyzeWithAgent } from '@/lib/ai/agents/analyze'
import type { HealthAgent } from '@/lib/db/schema'

const baseAgent: HealthAgent = {
  id: 'agent-1',
  name: 'Test Agent',
  specialty: 'cardiology',
  description: null,
  systemPrompt: 'You are a cardiologist',
      chatPrompt: null,
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
      expect(result.content).toBe('Mock analysis result. Mock analysis result. Mock analysis result. Mock analysis result. Mock analysis result. Mock analysis result.')
      expect(result.tokensUsed).toBe(100)
    })
  })

  describe('AC2 — outputType bifurcation', () => {
    it('uses generateText when outputType is text', async () => {
      // #given
      const agent = { ...baseAgent, outputType: 'text' }

      // #when
      const result = await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(generateText).toHaveBeenCalledOnce()
      expect(generateObject).not.toHaveBeenCalled()
      expect(result.status).toBe('completed')
      expect(result.content).toBe('Mock analysis result. Mock analysis result. Mock analysis result. Mock analysis result. Mock analysis result. Mock analysis result.')
      expect(result.structuredOutput).toBeUndefined()
    })

    it('uses generateObject when outputType is structured with schema', async () => {
      // #given
      const schema = { type: 'object', properties: { summary: { type: 'string' } } }
      const agent = { ...baseAgent, outputType: 'structured', outputSchema: schema }

      // #when
      const result = await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(generateObject).toHaveBeenCalledOnce()
      expect(generateText).not.toHaveBeenCalled()
      expect(result.status).toBe('completed')
      expect(result.content).toBe(JSON.stringify({ summary: 'structured result' }))
      expect(result.structuredOutput).toEqual({ summary: 'structured result' })
      expect(result.tokensUsed).toBe(150)
    })

    it('falls back to generateText when outputType is structured but outputSchema is null', async () => {
      // #given
      const agent = { ...baseAgent, outputType: 'structured', outputSchema: null }

      // #when
      const result = await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(generateText).toHaveBeenCalledOnce()
      expect(generateObject).not.toHaveBeenCalled()
      expect(result.status).toBe('completed')
    })
  })

  describe('AC3 — modelConfig spread', () => {
    it('passes modelConfig options to generateText', async () => {
      // #given
      const agent = { ...baseAgent, modelConfig: { topP: 0.9, seed: 42 } }

      // #when
      await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({ topP: 0.9, seed: 42 }),
      )
    })

    it('passes modelConfig options to generateObject', async () => {
      // #given
      const schema = { type: 'object', properties: {} }
      const agent = {
        ...baseAgent,
        outputType: 'structured',
        outputSchema: schema,
        modelConfig: { topK: 10, seed: 99 },
      }

      // #when
      await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({ topK: 10, seed: 99 }),
      )
    })

    it('passes no extra options when modelConfig is null', async () => {
      // #given
      const agent = { ...baseAgent, modelConfig: null }

      // #when
      await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(generateText).toHaveBeenCalledWith(
        expect.not.objectContaining({ topP: expect.anything() }),
      )
    })

    it('always respects temperature regardless of modelConfig', async () => {
      // #given
      const agent = { ...baseAgent, temperature: '0.3', modelConfig: { topP: 0.9 } }

      // #when
      await analyzeWithAgent(agent, 'analyze this', baseContext)

      // #then
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.3, topP: 0.9 }),
      )
    })
  })
})
