import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import {
  snapshots,
  analyses,
  completeAnalyses,
} from '@/lib/db/schema'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'
import { analyzeWithAgent, type AgentAnalysisResult } from '@/lib/ai/agents/analyze'
import { validateReportSections } from '@/lib/ai/utils/validate-report-sections'
import { readTimeoutMs, buildMedicalProfileContext, type AgentOutput } from './pipeline'

const ANALYSIS_PROMPT = `Realize uma análise funcional e integrativa dos dados fornecidos.

Processo de análise (5 passos):
1. Extração e priorização de biomarcadores por eixos funcionais
2. Análise e interpretação funcional (faixas otimizadas, não apenas referências laboratoriais)
3. Identificação de padrões e correlações sistêmicas
4. Contextualização com a base de conhecimento
5. Geração de insights e recomendações educacionais

Estruture sua resposta em Markdown com: Resumo Executivo, Análise por Eixos Funcionais, Padrões e Pontos de Atenção, Insights e Hipóteses, Recomendações Educacionais.

IMPORTANTE: Esta análise é para fins educacionais e não substitui avaliação médica profissional.`

const DISCLAIMER_TEXT =
  'Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional. Consulte sempre um médico qualificado.'

const SYNTHESIS_PROMPT = `Você é um especialista em síntese de análises médicas integrativas. Sua missão é consolidar os outputs de múltiplos agentes especializados em um relatório final coeso, completo e acionável.

Integre todas as perspectivas (foundation e specialized) seguindo EXATAMENTE este template — as seções com emojis são âncoras obrigatórias:

# Análise Integrativa de Saúde

## 📋 Resumo Executivo
[Visão geral em 2-3 parágrafos dos principais achados e correlações entre todas as especialidades]

## 🔍 Análise Detalhada por Eixos Funcionais

### Eixo Tireoidiano e Energético
- **Biomarcador:** [Valor] (Ref. Lab: [X-Y] | **Alvo Funcional: [valor]**)
  - **Interpretação:** [análise]

[Inclua outros eixos relevantes conforme os achados: Saúde Metabólica e Inflamatória, Status Nutricional e Hematológico, Função Detox e Imunológica]

## ⚠️ Padrões e Pontos de Atenção
- **[Padrão]:** [Descrição com indicadores visuais]

## 💡 Insights e Hipóteses de Causa Raiz
[Hipóteses sobre causas raiz — SEMPRE use "sugere", "indica", nunca diagnóstico direto]

## 📚 Recomendações Educacionais
1. **[Área]:** [Sugestão educacional]
   - Fonte: [título do artigo] — [autor]

REGRAS OBRIGATÓRIAS:
1. TÍTULO FIXO: Use exatamente "# Análise Integrativa de Saúde" — sem nome de paciente (LGPD)
2. INDICADORES VISUAIS nos biomarcadores — aplique com base nos dados do snapshot fornecido:
   - Status "high" ou "abnormal" → prefixo ↑ antes do valor (ex: "TSH: ↑ 8.2 mUI/L")
   - Status "low" → prefixo ↓ antes do valor (ex: "Vitamina D: ↓ 18 ng/mL")
   - Status "borderline" → prefixo ⚠ antes do valor (ex: "Glicose: ⚠ 99 mg/dL")
3. CITAÇÕES RAG: Adicione "Fonte: [título] — [autor]" SOMENTE quando o agente citou conhecimento da base de conhecimento. NUNCA invente citações.
4. Elimine redundâncias entre especialidades e priorize achados mais relevantes
5. NÃO inclua seção de disclaimer — será adicionado automaticamente pelo sistema`

export async function runCompleteAnalysis(
  userId: string,
  documentId: string,
  completeAnalysisId: string,
): Promise<void> {
  const startMs = Date.now()
  const hardTimeoutMs = readTimeoutMs('COMPLETE_ANALYSIS_TIMEOUT_MS', 180_000)
  const foundationTimeoutMs = readTimeoutMs('FOUNDATION_AGENT_TIMEOUT_MS', 45_000)
  const specializedTimeoutMs = readTimeoutMs('SPECIALIZED_AGENT_TIMEOUT_MS', 45_000)
  const synthesisTimeoutMs = readTimeoutMs('SYNTHESIS_TIMEOUT_MS', 45_000)

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

    const medicalProfileContext = await buildMedicalProfileContext(userId)

    const foundationAgents = await getActiveAgentsByRole('foundation')
    const specializedAgents = await getActiveAgentsByRole('specialized')

    if (foundationAgents.length === 0 || specializedAgents.length === 0) {
      throw new Error('No active foundation/specialized agents configured')
    }

    const agentOutputs: AgentOutput[] = []
    const foundationOutputs: AgentOutput[] = []

    // Phase 1 — Foundation (sequential)
    const globalDeadline = startMs + hardTimeoutMs

    for (const agent of foundationAgents) {
      if (Date.now() >= globalDeadline) break

      const remainingMs = globalDeadline - Date.now()
      const timeoutMs = Math.min(foundationTimeoutMs, remainingMs)

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
      const timeoutMs = Math.min(specializedTimeoutMs, remainingMs)

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
          Math.min(synthesisTimeoutMs, remainingMs),
        )

        try {
          const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: SYNTHESIS_PROMPT,
            prompt: `Snapshot de biomarcadores (use para indicadores ↑↓⚠):\n${snapshotContext}\n\nConsolide as seguintes análises especializadas em um relatório integrado:\n\n${synthesisInput}`,
            abortSignal: synthController.signal,
          })
          reportMarkdown = text + '\n\n---\n\n> ' + DISCLAIMER_TEXT
          validateReportSections(reportMarkdown)
        } catch {
          reportMarkdown = synthesisInput + '\n\n---\n\n> ' + DISCLAIMER_TEXT
        } finally {
          clearTimeout(synthTimeoutId)
        }
      } else {
        reportMarkdown = synthesisInput + '\n\n---\n\n> ' + DISCLAIMER_TEXT
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
