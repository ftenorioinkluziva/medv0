import { google } from '@ai-sdk/google'
import { createOpenAI, openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

const PROVIDERS = { google, openai, anthropic } as const
const DEFAULT_MODEL = 'google/gemini-2.5-flash'
const DEFAULT_MODEL_SLUG = 'gemini-2.5-flash'
const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL ?? 'https://ai-gateway.vercel.sh/v1'
const aiGatewayProvider = process.env.AI_GATEWAY_API_KEY
  ? createOpenAI({ apiKey: process.env.AI_GATEWAY_API_KEY, baseURL: AI_GATEWAY_BASE_URL })
  : null

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

  if (aiGatewayProvider) {
    return aiGatewayProvider(normalizedModel)
  }

  const providerName = normalizedModel.slice(0, slashIndex).toLowerCase() as SupportedProvider
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
