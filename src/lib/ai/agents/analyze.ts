import { generateText, generateObject, jsonSchema } from 'ai'
import type { HealthAgent } from '@/lib/db/schema'
import type { ModelConfig } from '@/lib/db/schema'
import { searchKnowledge } from '@/lib/ai/rag/vector-search'
import { resolveModel } from '@/lib/ai/core/resolve-model'

export interface AgentAnalysisResult {
  content: string
  ragContextUsed: boolean
  tokensUsed: number | null
  durationMs: number | null
  status: 'completed' | 'timeout' | 'error'
  errorMessage?: string
  structuredOutput?: unknown
}

export async function analyzeWithAgent(
  agent: HealthAgent,
  analysisPrompt: string,
  context: {
    snapshotContext: string
    medicalProfileContext: string
    knowledgeContext?: string
    foundationContext?: string
    previousAnalysisContext?: string
  },
  signal?: AbortSignal,
): Promise<AgentAnalysisResult> {
  const startMs = Date.now()

  let knowledgeContext = context.knowledgeContext ?? ''
  let ragContextUsed = false

  if (!knowledgeContext) {
    try {
      const ragQueryParts: string[] = [agent.specialty]
      try {
        const profile = JSON.parse(context.medicalProfileContext) as Record<string, unknown>
        if (typeof profile.healthObjectives === 'string' && profile.healthObjectives) {
          ragQueryParts.push(profile.healthObjectives)
        }
      } catch {
        // profile parse failure is non-blocking
      }
      const ragChunks = await searchKnowledge(ragQueryParts.join('. '), 8, agent.id)
      if (ragChunks.length > 0) {
        knowledgeContext = ragChunks.map((c) => c.content).join('\n\n')
        ragContextUsed = true
      }
    } catch {
      // RAG failure is non-blocking — proceed without knowledge context
    }
  } else {
    ragContextUsed = knowledgeContext.length > 0
  }

  const contextParts = [
    `## Dados do Exame\n${context.snapshotContext}`,
    `## Perfil Clínico\n${context.medicalProfileContext}`,
  ]

  if (knowledgeContext) {
    contextParts.push(`## Base de Conhecimento\n${knowledgeContext}`)
  }

  if (context.foundationContext) {
    contextParts.push(`## Análises Foundation\n${context.foundationContext}`)
  }

  if (context.previousAnalysisContext) {
    contextParts.push(`## Análise Anterior (referência para evolução)\n${context.previousAnalysisContext}`)
  }

  const fullPrompt = `${analysisPrompt}\n\n---\n\n${contextParts.join('\n\n')}`

  const modelConfigOptions = spreadModelConfig(agent.modelConfig as ModelConfig | null)

  try {
    if (agent.outputType === 'structured' && agent.outputSchema) {
      const { object, usage } = await generateObject({
        model: resolveModel(agent.model),
        system: agent.systemPrompt,
        prompt: fullPrompt,
        schema: jsonSchema(agent.outputSchema as Record<string, unknown>),
        temperature: Number(agent.temperature),
        ...modelConfigOptions,
        abortSignal: signal,
      })

      return {
        content: JSON.stringify(object),
        structuredOutput: object,
        ragContextUsed,
        tokensUsed: usage?.totalTokens ?? null,
        durationMs: Date.now() - startMs,
        status: 'completed',
      }
    }

    const { text, usage } = await generateText({
      model: resolveModel(agent.model),
      system: agent.systemPrompt,
      prompt: fullPrompt,
      temperature: Number(agent.temperature),
      ...modelConfigOptions,
      abortSignal: signal,
    })

    return {
      content: text,
      ragContextUsed,
      tokensUsed: usage?.totalTokens ?? null,
      durationMs: Date.now() - startMs,
      status: 'completed',
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        content: '',
        ragContextUsed,
        tokensUsed: null,
        durationMs: Date.now() - startMs,
        status: 'timeout',
      }
    }
    return {
      content: '',
      ragContextUsed,
      tokensUsed: null,
      durationMs: Date.now() - startMs,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}

function spreadModelConfig(config: ModelConfig | null): Record<string, unknown> {
  if (!config) return {}
  const result: Record<string, unknown> = {}
  if (config.topP != null) result.topP = config.topP
  if (config.topK != null) result.topK = config.topK
  if (config.seed != null) result.seed = config.seed
  if (config.frequencyPenalty != null) result.frequencyPenalty = config.frequencyPenalty
  if (config.presencePenalty != null) result.presencePenalty = config.presencePenalty
  return result
}
