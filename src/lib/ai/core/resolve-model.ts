import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

const PROVIDERS = { google, openai, anthropic } as const
const DEFAULT_MODEL = 'google/gemini-2.5-flash'
const DEFAULT_MODEL_SLUG = 'gemini-2.5-flash'

export type SupportedProvider = keyof typeof PROVIDERS

export function resolveModel(modelString: string) {
  const slashIndex = modelString.indexOf('/')

  if (slashIndex === -1) {
    console.warn(`[resolveModel] Invalid model format "${modelString}", falling back to ${DEFAULT_MODEL}`)
    return google(DEFAULT_MODEL_SLUG)
  }

  const providerName = modelString.slice(0, slashIndex) as SupportedProvider
  const modelSlug = modelString.slice(slashIndex + 1)

  if (providerName === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const providerFn = PROVIDERS[providerName]

  if (!providerFn) {
    console.warn(`[resolveModel] Unknown provider "${providerName}", falling back to ${DEFAULT_MODEL}`)
    return google(DEFAULT_MODEL_SLUG)
  }

  return providerFn(modelSlug)
}
