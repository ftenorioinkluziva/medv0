import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import type { HealthAgent } from '@/lib/db/schema'
import { searchKnowledge } from '@/lib/ai/rag/vector-search'

export interface AgentAnalysisResult {
  content: string
  ragContextUsed: boolean
  tokensUsed: number | null
  durationMs: number | null
  status: 'completed' | 'timeout' | 'error'
  errorMessage?: string
}

export async function analyzeWithAgent(
  agent: HealthAgent,
  analysisPrompt: string,
  context: {
    snapshotContext: string
    medicalProfileContext: string
    knowledgeContext?: string
    foundationContext?: string
  },
  signal?: AbortSignal,
): Promise<AgentAnalysisResult> {
  const startMs = Date.now()

  let knowledgeContext = context.knowledgeContext ?? ''
  let ragContextUsed = false

  if (!knowledgeContext) {
    try {
      const ragChunks = await searchKnowledge(
        `${agent.specialty}: ${analysisPrompt.slice(0, 200)}`,
        5,
      )
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

  const fullPrompt = `${analysisPrompt}\n\n---\n\n${contextParts.join('\n\n')}`

  const modelSlug = agent.model.replace('google/', '')

  try {
    const { text, usage } = await generateText({
      model: google(modelSlug),
      system: agent.systemPrompt,
      prompt: fullPrompt,
      temperature: Number(agent.temperature),
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
