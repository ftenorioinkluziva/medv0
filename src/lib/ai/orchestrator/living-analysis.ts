import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import {
  snapshots,
  medicalProfiles,
  analyses,
  livingAnalyses,
  livingAnalysisVersions,
} from '@/lib/db/schema'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'
import { analyzeWithAgent, type AgentAnalysisResult } from '@/lib/ai/agents/analyze'
import { validateReportSections } from '@/lib/ai/utils/validate-report-sections'

const LIVING_ANALYSIS_PROMPT = `Realize uma análise funcional e integrativa dos dados fornecidos.

Você está operando em modo de **análise contínua (documento vivo)**. Os dados podem incluir:
- Um snapshot do exame mais recente do paciente
- A análise anterior (se existir), que representa o estado consolidado até o momento

Processo de análise (6 passos):
1. Extração e priorização de biomarcadores por eixos funcionais
2. Análise e interpretação funcional (faixas otimizadas, não apenas referências laboratoriais)
3. Comparação com a análise anterior (quando disponível): identifique tendências de melhora, piora ou estabilidade
4. Identificação de padrões e correlações sistêmicas
5. Contextualização com a base de conhecimento
6. Geração de insights e recomendações educacionais

Estruture sua resposta em Markdown com: Resumo Executivo, Análise por Eixos Funcionais, Evolução (quando houver análise anterior), Padrões e Pontos de Atenção, Insights e Hipóteses, Recomendações Educacionais.

Quando houver análise anterior disponível:
- Compare valores atuais com os anteriores usando ↑ (subiu), ↓ (desceu), = (estável)
- Destaque novos achados que não existiam na análise anterior
- Identifique tendências positivas e negativas

IMPORTANTE: Esta análise é para fins educacionais e não substitui avaliação médica profissional.`

const DISCLAIMER_TEXT =
  'Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional. Consulte sempre um médico qualificado.'

const LIVING_SYNTHESIS_PROMPT = `Você é um especialista em síntese de análises médicas integrativas. Sua missão é consolidar os outputs de múltiplos agentes especializados em um relatório final coeso, completo e acionável.

Este é um **documento vivo** — pode haver uma análise anterior que serve de referência para evolução.

Integre todas as perspectivas (foundation e specialized) seguindo EXATAMENTE este template — as seções com emojis são âncoras obrigatórias:

# Análise Integrativa de Saúde

## 📋 Resumo Executivo
[Visão geral em 2-3 parágrafos dos principais achados e correlações entre todas as especialidades]
[Se houver análise anterior, inclua um parágrafo sobre a evolução geral]

## 📈 Evolução
[Se houver análise anterior: compare os principais biomarcadores com valores anteriores]
[Use indicadores: ↑ subiu, ↓ desceu, = estável]
[Destaque: novos achados, tendências positivas, pontos de atenção que pioraram]
[Se for a primeira análise: "Esta é a primeira análise. Futuras análises mostrarão a evolução dos seus biomarcadores."]

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
5. NÃO inclua seção de disclaimer — será adicionado automaticamente pelo sistema
6. Seção "📈 Evolução" é OBRIGATÓRIA — mesmo na primeira análise`

interface AgentOutput {
  agentId: string
  agentName: string
  role: string
  content: string
  status: 'completed' | 'timeout' | 'error'
}

function readTimeoutMs(envName: string, fallbackMs: number): number {
  const rawValue = process.env[envName]
  if (!rawValue) return fallbackMs

  const parsed = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsed) || parsed <= 0) return fallbackMs

  return parsed
}

export async function runLivingAnalysis(
  userId: string,
  triggerDocumentId: string,
  livingAnalysisId: string,
  versionId: string,
): Promise<void> {
  const startMs = Date.now()
  const hardTimeoutMs = readTimeoutMs('COMPLETE_ANALYSIS_TIMEOUT_MS', 180_000)
  const foundationTimeoutMs = readTimeoutMs('FOUNDATION_AGENT_TIMEOUT_MS', 45_000)
  const specializedTimeoutMs = readTimeoutMs('SPECIALIZED_AGENT_TIMEOUT_MS', 45_000)
  const synthesisTimeoutMs = readTimeoutMs('SYNTHESIS_TIMEOUT_MS', 45_000)

  await db
    .update(livingAnalyses)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(livingAnalyses.id, livingAnalysisId))

  await db
    .update(livingAnalysisVersions)
    .set({ status: 'processing' })
    .where(eq(livingAnalysisVersions.id, versionId))

  try {
    const [snapshotRow] = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.documentId, triggerDocumentId))
      .limit(1)

    const snapshotContext = snapshotRow
      ? JSON.stringify(snapshotRow.structuredData)
      : '{}'

    const [previousVersion] = await db
      .select({ reportMarkdown: livingAnalysisVersions.reportMarkdown })
      .from(livingAnalysisVersions)
      .where(
        and(
          eq(livingAnalysisVersions.livingAnalysisId, livingAnalysisId),
          eq(livingAnalysisVersions.status, 'completed'),
        ),
      )
      .orderBy(desc(livingAnalysisVersions.version))
      .limit(1)

    const previousAnalysisContext = previousVersion?.reportMarkdown || ''

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

    if (foundationAgents.length === 0 || specializedAgents.length === 0) {
      throw new Error('No active foundation/specialized agents configured')
    }

    const agentOutputs: AgentOutput[] = []
    const foundationOutputs: AgentOutput[] = []
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
          LIVING_ANALYSIS_PROMPT,
          {
            snapshotContext,
            medicalProfileContext,
            previousAnalysisContext,
          },
          controller.signal,
        )
      } finally {
        clearTimeout(timeoutId)
      }

      await db.insert(analyses).values({
        userId,
        documentId: triggerDocumentId,
        livingAnalysisVersionId: versionId,
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
          LIVING_ANALYSIS_PROMPT,
          {
            snapshotContext,
            medicalProfileContext,
            foundationContext,
            previousAnalysisContext,
          },
          controller.signal,
        )
      } finally {
        clearTimeout(timeoutId)
      }

      await db.insert(analyses).values({
        userId,
        documentId: triggerDocumentId,
        livingAnalysisVersionId: versionId,
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

    let reportMarkdown = ''
    const allOutputsForSynthesis = [...foundationOutputs, ...specializedOutputs]

    if (allOutputsForSynthesis.length > 0) {
      const synthesisInput = allOutputsForSynthesis
        .map((o) => `## Análise: ${o.agentName}\n${o.content}`)
        .join('\n\n---\n\n')

      const previousSection = previousAnalysisContext
        ? `\n\n## Análise Anterior (use para comparação de evolução)\n${previousAnalysisContext}`
        : '\n\n## Análise Anterior\nEsta é a primeira análise deste paciente. Não há dados anteriores para comparação.'

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
            system: LIVING_SYNTHESIS_PROMPT,
            prompt: `Snapshot de biomarcadores (use para indicadores ↑↓⚠):\n${snapshotContext}${previousSection}\n\nConsolide as seguintes análises especializadas em um relatório integrado:\n\n${synthesisInput}`,
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
      .update(livingAnalysisVersions)
      .set({
        reportMarkdown,
        analysisData: agentOutputs as unknown as Record<string, unknown>[],
        agentsCount: agentOutputs.length,
        foundationCompleted,
        specializedCompleted,
        totalDurationMs: Date.now() - startMs,
        status: 'completed',
      })
      .where(eq(livingAnalysisVersions.id, versionId))

    const [latestVersion] = await db
      .select({ version: livingAnalysisVersions.version })
      .from(livingAnalysisVersions)
      .where(eq(livingAnalysisVersions.id, versionId))
      .limit(1)

    await db
      .update(livingAnalyses)
      .set({
        reportMarkdown,
        analysisData: agentOutputs as unknown as Record<string, unknown>[],
        currentVersion: latestVersion?.version ?? 1,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(livingAnalyses.id, livingAnalysisId))

  } catch (error) {
    await db
      .update(livingAnalysisVersions)
      .set({
        status: 'failed',
        totalDurationMs: Date.now() - startMs,
      })
      .where(eq(livingAnalysisVersions.id, versionId))

    await db
      .update(livingAnalyses)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(livingAnalyses.id, livingAnalysisId))

    console.error('[living-analysis] Error:', error)
    throw error
  }
}
