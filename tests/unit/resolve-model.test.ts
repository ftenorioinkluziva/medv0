import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((slug: string) => ({ provider: 'google', slug })),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((slug: string) => ({ provider: 'openai', slug })),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn((slug: string) => ({ provider: 'anthropic', slug })),
}))

import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { resolveModel } from '@/lib/ai/core/resolve-model'

describe('resolveModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ANTHROPIC_API_KEY
  })

  describe('AC1 — factory function', () => {
    it('resolves google provider', () => {
      // #given
      const modelString = 'google/gemini-2.5-flash'

      // #when
      const result = resolveModel(modelString)

      // #then
      expect(google).toHaveBeenCalledWith('gemini-2.5-flash')
      expect(result).toEqual({ provider: 'google', slug: 'gemini-2.5-flash' })
    })

    it('resolves openai provider', () => {
      // #given
      const modelString = 'openai/gpt-4o'

      // #when
      const result = resolveModel(modelString)

      // #then
      expect(openai).toHaveBeenCalledWith('gpt-4o')
      expect(result).toEqual({ provider: 'openai', slug: 'gpt-4o' })
    })

    it('resolves anthropic provider when API key is set', () => {
      // #given
      process.env.ANTHROPIC_API_KEY = 'test-key'
      const modelString = 'anthropic/claude-sonnet-4-5'

      // #when
      const result = resolveModel(modelString)

      // #then
      expect(anthropic).toHaveBeenCalledWith('claude-sonnet-4-5')
      expect(result).toEqual({ provider: 'anthropic', slug: 'claude-sonnet-4-5' })
    })

    it('falls back to google when format has no slash', () => {
      // #given
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const modelString = 'invalid-format'

      // #when
      const result = resolveModel(modelString)

      // #then
      expect(google).toHaveBeenCalledWith('gemini-2.5-flash')
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid model format'))
      expect(result).toEqual({ provider: 'google', slug: 'gemini-2.5-flash' })

      warnSpy.mockRestore()
    })

    it('falls back to google when provider is unknown', () => {
      // #given
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const modelString = 'mistral/mistral-7b'

      // #when
      const result = resolveModel(modelString)

      // #then
      expect(google).toHaveBeenCalledWith('gemini-2.5-flash')
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown provider'))
      expect(result).toEqual({ provider: 'google', slug: 'gemini-2.5-flash' })

      warnSpy.mockRestore()
    })
  })

  describe('AC5 — env var validation', () => {
    it('throws when anthropic provider used without ANTHROPIC_API_KEY', () => {
      // #given — ANTHROPIC_API_KEY is unset (cleared in beforeEach)
      const modelString = 'anthropic/claude-sonnet-4-5'

      // #when / #then
      expect(() => resolveModel(modelString)).toThrow('ANTHROPIC_API_KEY not configured')
    })

    it('does not throw for openai without OPENAI_API_KEY', () => {
      // #given — optional key not set
      delete process.env.OPENAI_API_KEY
      const modelString = 'openai/gpt-4o'

      // #when / #then — no throw, openai SDK handles it
      expect(() => resolveModel(modelString)).not.toThrow()
    })
  })
})
