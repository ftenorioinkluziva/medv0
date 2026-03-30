import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import {
  snapshots,
  medicalProfiles,
  analyses,
  completeAnalyses,
} from '@/lib/db/schema'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'
import { analyzeWithAgent, type AgentAnalysisResult } from '@/lib/ai/agents/analyze'

const ANALYSIS_PROMPT = `Realize uma análise funcional e integrativa dos dados fornecidos.

Processo de análise (5 passos):
1. Extração e priorização de biomarcadores por eixos funcionais
2. Análise e interpretação funcional (faixas otimizadas, não apenas referências laboratoriais)
3. Identificação de padrões e correlações sistêmicas
4. Contextualização com a base de conhecimento
5. Geração de insights e recomendações educacionais

Estruture sua resposta em Markdown com: Resumo Executivo, Análise por Eixos Funcionais, Padrões e Pontos de Atenção, Insights e Hipóteses, Recomendações Educacionais.

IMPORTANTE: Esta análise é para fins educacionais e não substitui avaliação médica profissional.`

const SYNTHESIS_PROMPT = `Você é um especialista em síntese de análises médicas integrativas. Sua missão é consolidar os outputs de múltiplos agentes especializados em um relatório final coeso, completo e acionável.

Integre todas as perspectivas (foundation e specialized) em um único relatório Markdown estruturado, eliminando redundâncias, destacando correlações entre as especialidades e priorizando os achados mais relevantes.

Formato de saída obrigatório:
# Relatório de Análise Integrativa

## 📋 Resumo Executivo
[2-3 parágrafos com principais achados integrados de todas as especialidades]

## 🔍 Análise por Especialidade
[Seção para cada agente com seus principais achados]

## ⚠️ Correlações e Padrões Sistêmicos
[Conexões identificadas entre as diferentes especialidades]

## 💡 Hipóteses de Causa Raiz Integradas
[Hipóteses que conectam achados de múltiplas especialidades]

## 📚 Plano de Ação Educacional
[Recomendações priorizadas e integradas]

## ⚕️ Observações
Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional.`

interface AgentOutput {
  agentId: string
  agentName: string
  role: string
  content: string
  status: 'completed' | 'timeout' | 'error'
}

export async function runCompleteAnalysis(
  userId: string,
  documentId: string,
  completeAnalysisId: string,
): Promise<void> {
  const startMs = Date.now()

  await db
    .update(completeAnalyses)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(completeAnalyses.id, completeAnalysisId))

  try {
    const [snapshotRow] = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.documentId, documentId))
      .limit(1)

    const snapshotContext = snapshotRow
      ? JSON.stringify(snapshotRow.structuredData)
      : '{}'

    const [profile] = await db
      .select()
      .from(medicalProfiles)
      .where(eq(medicalProfiles.userId, userId))
      .limit(1)

    const medicalProfileContext = profile
      ? JSON.stringify({
          age: profile.age,
          gender: profile.gender,
          height: profile.height,
          weight: profile.weight,
          systolicPressure: profile.systolicPressure,
          diastolicPressure: profile.diastolicPressure,
          restingHeartRate: profile.restingHeartRate,
          healthObjectives: profile.healthObjectives,
          medicalConditions: profile.medicalConditions,
        })
      : '{}'

    const foundationAgents = await getActiveAgentsByRole('foundation')
    const specializedAgents = await getActiveAgentsByRole('specialized')

    const agentOutputs: AgentOutput[] = []
    const foundationOutputs: AgentOutput[] = []

    // Phase 1 — Foundation (sequential)
    const HARD_TIMEOUT_MS = 60_000
    const globalDeadline = startMs + HARD_TIMEOUT_MS

    for (const agent of foundationAgents) {
      if (Date.now() >= globalDeadline) break

      const remainingMs = globalDeadline - Date.now()
      const timeoutMs = Math.min(30_000, remainingMs)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      let result: AgentAnalysisResult
      try {
        result = await analyzeWithAgent(
          agent,
          ANALYSIS_PROMPT,
          { snapshotContext, medicalProfileContext },
          controller.signal,
        )
      } finally {
        clearTimeout(timeoutId)
      }

      await db.insert(analyses).values({
        userId,
        documentId,
        completeAnalysisId,
        agentId: agent.id,
        agentName: agent.name,
        analysisRole: agent.analysisRole,
        content: result.content,
        ragContextUsed: result.ragContextUsed,
        tokensUsed: result.tokensUsed,
        durationMs: result.durationMs,
        status: result.status,
        errorMessage: result.errorMessage ?? null,
      })

      const output: AgentOutput = {
        agentId: agent.id,
        agentName: agent.name,
        role: agent.analysisRole,
        content: result.content,
        status: result.status,
      }
      agentOutputs.push(output)
      if (result.status === 'completed') foundationOutputs.push(output)
    }

    // Phase 2 — Specialized (parallel)
    const foundationContext = foundationOutputs
      .map((o) => `### ${o.agentName}\n${o.content}`)
      .join('\n\n')

    const specializedTasks = specializedAgents.map(async (agent) => {
      if (Date.now() >= globalDeadline) return

      const remainingMs = globalDeadline - Date.now()
      const timeoutMs = Math.min(20_000, remainingMs)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      let result: AgentAnalysisResult
      try {
        result = await analyzeWithAgent(
          agent,
          ANALYSIS_PROMPT,
          { snapshotContext, medicalProfileContext, foundationContext },
          controller.signal,
        )
      } finally {
        clearTimeout(timeoutId)
      }

      await db.insert(analyses).values({
        userId,
        documentId,
        completeAnalysisId,
        agentId: agent.id,
        agentName: agent.name,
        analysisRole: agent.analysisRole,
        content: result.content,
        ragContextUsed: result.ragContextUsed,
        tokensUsed: result.tokensUsed,
        durationMs: result.durationMs,
        status: result.status,
        errorMessage: result.errorMessage ?? null,
      })

      return {
        agentId: agent.id,
        agentName: agent.name,
        role: agent.analysisRole,
        content: result.content,
        status: result.status,
      } as AgentOutput
    })

    const specializedResults = await Promise.allSettled(specializedTasks)
    const specializedOutputs: AgentOutput[] = []
    for (const settled of specializedResults) {
      if (settled.status === 'fulfilled' && settled.value) {
        agentOutputs.push(settled.value)
        if (settled.value.status === 'completed') specializedOutputs.push(settled.value)
      }
    }

    // Phase 3 — Synthesis
    let reportMarkdown = ''
    const allOutputsForSynthesis = [...foundationOutputs, ...specializedOutputs]

    if (allOutputsForSynthesis.length > 0) {
      const synthesisInput = allOutputsForSynthesis
        .map((o) => `## Análise: ${o.agentName}\n${o.content}`)
        .join('\n\n---\n\n')

      const remainingMs = globalDeadline - Date.now()
      if (remainingMs > 5_000) {
        const synthController = new AbortController()
        const synthTimeoutId = setTimeout(
          () => synthController.abort(),
          Math.min(30_000, remainingMs),
        )

        try {
          const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: SYNTHESIS_PROMPT,
            prompt: `Consolide as seguintes análises especializadas em um relatório integrado:\n\n${synthesisInput}`,
            abortSignal: synthController.signal,
          })
          reportMarkdown = text
        } catch {
          reportMarkdown = synthesisInput
        } finally {
          clearTimeout(synthTimeoutId)
        }
      } else {
        reportMarkdown = synthesisInput
      }
    }

    const foundationCompleted = foundationOutputs.filter((o) => o.status === 'completed').length
    const specializedCompleted = specializedOutputs.filter((o) => o.status === 'completed').length

    await db
      .update(completeAnalyses)
      .set({
        reportMarkdown,
        analysisData: agentOutputs as unknown as Record<string, unknown>[],
        agentsCount: agentOutputs.length,
        foundationCompleted,
        specializedCompleted,
        totalDurationMs: Date.now() - startMs,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(completeAnalyses.id, completeAnalysisId))

    await db
      .update(analyses)
      .set({ completeAnalysisId })
      .where(eq(analyses.completeAnalysisId, completeAnalysisId))
  } catch (error) {
    await db
      .update(completeAnalyses)
      .set({
        status: 'failed',
        totalDurationMs: Date.now() - startMs,
        updatedAt: new Date(),
      })
      .where(eq(completeAnalyses.id, completeAnalysisId))

    console.error('[complete-analysis] Error:', error)
    throw error
  }
}
