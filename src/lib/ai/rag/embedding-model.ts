import { google } from '@ai-sdk/google'
import { aiGatewayProvider, assertAiGatewayConfigured } from '@/lib/ai/core/ai-gateway'
import { logger } from '@/lib/observability/logger'

const LEGACY_EMBEDDING_MODEL = process.env.GOOGLE_EMBEDDING_MODEL
const CONFIGURED_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? LEGACY_EMBEDDING_MODEL

if (!process.env.EMBEDDING_MODEL && LEGACY_EMBEDDING_MODEL) {
  logger.warn('[embedding] GOOGLE_EMBEDDING_MODEL is deprecated; prefer EMBEDDING_MODEL')
}

export const KNOWLEDGE_EMBEDDING_MODEL_NAME = resolveEmbeddingModel(
  CONFIGURED_EMBEDDING_MODEL,
)
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 768

export function getKnowledgeEmbeddingModel() {
  assertAiGatewayConfigured('Knowledge embeddings')

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
      logger.warn(
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
    logger.warn(
      `[embedding] Invalid EMBEDDING_MODEL "${rawModel}", falling back to ${fallback}`,
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
