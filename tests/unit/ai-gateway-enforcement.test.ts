import { afterEach, describe, expect, it, vi } from 'vitest'

const originalNodeEnv = process.env.NODE_ENV
const originalGatewayKey = process.env.AI_GATEWAY_API_KEY

function setNodeEnv(value: string | undefined) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
    writable: true,
    enumerable: true,
  })
}

afterEach(() => {
  vi.resetModules()
  setNodeEnv(originalNodeEnv)
  process.env.AI_GATEWAY_API_KEY = originalGatewayKey
  vi.clearAllMocks()
})

describe('AI Gateway enforcement in production', () => {
  it('throws on resolveModel when AI gateway is missing in production', async () => {
    setNodeEnv('production')
    delete process.env.AI_GATEWAY_API_KEY

    const { resolveModel } = await import('@/lib/ai/core/resolve-model')

    expect(() => resolveModel('google/gemini-2.5-flash')).toThrow(
      'Model resolution requires AI_GATEWAY_API_KEY in production',
    )
  })

  it('throws on embedding model resolution when AI gateway is missing in production', async () => {
    setNodeEnv('production')
    delete process.env.AI_GATEWAY_API_KEY

    const { getKnowledgeEmbeddingModel } = await import('@/lib/ai/rag/embedding-model')

    expect(() => getKnowledgeEmbeddingModel()).toThrow(
      'Knowledge embeddings requires AI_GATEWAY_API_KEY in production',
    )
  })
})
