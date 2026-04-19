import { google } from '@ai-sdk/google'

export const KNOWLEDGE_EMBEDDING_MODEL_NAME = resolveEmbeddingModel(
  process.env.GOOGLE_EMBEDDING_MODEL,
)
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 768

export function getKnowledgeEmbeddingModel() {
  const normalizedName = KNOWLEDGE_EMBEDDING_MODEL_NAME.trim()

  // Always use the Google provider directly for embeddings.
  // The AI Gateway (OpenAI-compat) does not forward outputDimensionality,
  // causing stored 768-dim vectors to mismatch at query time.
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

  // Allow bare model names (no slash) — e.g. "gemini-embedding-001"
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
