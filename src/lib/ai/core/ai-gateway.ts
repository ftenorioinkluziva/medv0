import { createOpenAI } from '@ai-sdk/openai'

const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL ?? 'https://ai-gateway.vercel.sh/v1'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export const aiGatewayProvider = process.env.AI_GATEWAY_API_KEY
  ? createOpenAI({ apiKey: process.env.AI_GATEWAY_API_KEY, baseURL: AI_GATEWAY_BASE_URL })
  : null

export function hasAiGateway(): boolean {
  return aiGatewayProvider !== null
}

export function assertAiGatewayConfigured(feature: string): void {
  if (IS_PRODUCTION && !aiGatewayProvider) {
    throw new Error(`${feature} requires AI_GATEWAY_API_KEY in production`)
  }
}
