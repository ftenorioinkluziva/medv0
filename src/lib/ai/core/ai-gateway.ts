import { createOpenAI } from '@ai-sdk/openai'

const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL ?? 'https://ai-gateway.vercel.sh/v1'

export const aiGatewayProvider = process.env.AI_GATEWAY_API_KEY
  ? createOpenAI({ apiKey: process.env.AI_GATEWAY_API_KEY, baseURL: AI_GATEWAY_BASE_URL })
  : null

export function hasAiGateway(): boolean {
  return aiGatewayProvider !== null
}
