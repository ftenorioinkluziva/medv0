import { google } from '@ai-sdk/google'

export const KNOWLEDGE_EMBEDDING_MODEL_NAME =
  process.env.GOOGLE_EMBEDDING_MODEL ?? 'gemini-embedding-001'
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 768

export function getKnowledgeEmbeddingModel() {
  return google.textEmbeddingModel(KNOWLEDGE_EMBEDDING_MODEL_NAME)
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
