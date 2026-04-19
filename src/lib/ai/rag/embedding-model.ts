import { google } from '@ai-sdk/google'
import { aiGatewayProvider } from '@/lib/ai/core/ai-gateway'

export const KNOWLEDGE_EMBEDDING_MODEL_NAME = resolveEmbeddingModel(
  process.env.GOOGLE_EMBEDDING_MODEL,
)
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 768

export function getKnowledgeEmbeddingModel() {
  const normalizedName = KNOWLEDGE_EMBEDDING_MODEL_NAME.trim()

  if (aiGatewayProvider) {
    // AI Gateway accepts `dimensions` (OpenAI spec) and auto-maps it to each
    // provider's native field. Passed via providerOptions.openai.dimensions
    // in getKnowledgeEmbeddingProviderOptions().
    const gatewayModelName = normalizedName.includes('/')
      ? normalizedName
      : `google/${normalizedName}`
    return aiGatewayProvider.textEmbeddingModel(gatewayModelName)
  }

  if (normalizedName.includes('/')) {
    const [provider, slug] = normalizedName.split('/')
    if (provider !== 'google' || !slug) {
      console.warn(
        `[embedding] Unsupported provider "${provider}"; falling back to gemini-embedding-001`,
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
    // Used by Google provider directly (no gateway)
    google: {
      outputDimensionality: KNOWLEDGE_EMBEDDING_DIMENSIONS,
      taskType,
    },
    // Used by AI Gateway (OpenAI-compat): gateway auto-maps `dimensions`
    // to the provider's native field (outputDimensionality for Google)
    openai: {
      dimensions: KNOWLEDGE_EMBEDDING_DIMENSIONS,
    },
  }
}
