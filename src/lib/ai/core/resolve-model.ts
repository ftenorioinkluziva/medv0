import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { aiGatewayProvider } from './ai-gateway'

const PROVIDERS = { google, openai, anthropic } as const

export const DEFAULT_MODEL = 'google/gemini-2.5-flash'
const DEFAULT_MODEL_SLUG = 'gemini-2.5-flash'

export type SupportedProvider = keyof typeof PROVIDERS

export function resolveModel(modelString: string) {
  const normalizedModel = modelString.trim()
  const slashIndex = normalizedModel.indexOf('/')

  if (slashIndex <= 0 || slashIndex === normalizedModel.length - 1) {
    console.warn(`[resolveModel] Invalid model format "${modelString}", falling back to ${DEFAULT_MODEL}`)
    if (aiGatewayProvider) {
      return aiGatewayProvider(DEFAULT_MODEL)
    }
    return google(DEFAULT_MODEL_SLUG)
  }

  const providerName = normalizedModel.slice(0, slashIndex).toLowerCase() as SupportedProvider

  if (aiGatewayProvider) {
    if (!PROVIDERS[providerName]) {
      console.warn(`[resolveModel] Unknown provider "${providerName}", routing through AI Gateway`)
    }
    return aiGatewayProvider(normalizedModel)
  }

  const modelSlug = normalizedModel.slice(slashIndex + 1)

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
