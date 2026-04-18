import { google } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

export const KNOWLEDGE_EMBEDDING_MODEL_NAME = resolveEmbeddingModel(
  process.env.GOOGLE_EMBEDDING_MODEL,
)
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 768
const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL ?? 'https://ai-gateway.vercel.sh/v1'
const aiGatewayProvider = process.env.AI_GATEWAY_API_KEY
  ? createOpenAI({ apiKey: process.env.AI_GATEWAY_API_KEY, baseURL: AI_GATEWAY_BASE_URL })
  : null

export function getKnowledgeEmbeddingModel() {
  const normalizedName = KNOWLEDGE_EMBEDDING_MODEL_NAME.trim()

  if (aiGatewayProvider) {
    const gatewayModelName = normalizedName.includes('/')
      ? normalizedName
      : `google/${normalizedName}`
    return aiGatewayProvider.textEmbeddingModel(gatewayModelName)
  }

  if (normalizedName.includes('/')) {
    const [provider, slug] = normalizedName.split('/')
    if (provider !== 'google' || !slug) {
      console.warn(
        `[embedding] Unsupported provider "${provider}" without AI Gateway; falling back to gemini-embedding-001`,
      )
      return google.textEmbeddingModel('gemini-embedding-001')
    }
    return google.textEmbeddingModel(slug)
  }

  return google.textEmbeddingModel(normalizedName)
}

function resolveEmbeddingModel(rawModel?: string): string {
  const fallback = 'gemini-embedding-001'
  if (!rawModel) return fallback

  const normalized = rawModel.trim()
  const slashIndex = normalized.indexOf('/')

  if (slashIndex === 0 || slashIndex === normalized.length - 1) {
    console.warn(
      `[embedding] Invalid GOOGLE_EMBEDDING_MODEL "${rawModel}", falling back to ${fallback}`,
    )
    return fallback
  }

  return normalized
}

export function getKnowledgeEmbeddingProviderOptions(
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
) {
  return {
    google: {
      outputDimensionality: KNOWLEDGE_EMBEDDING_DIMENSIONS,
      taskType,
    },
  }
}
