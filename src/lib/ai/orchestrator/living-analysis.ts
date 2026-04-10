import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import {
  snapshots,
  analyses,
  livingAnalyses,
  livingAnalysisVersions,
} from '@/lib/db/schema'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'
import { analyzeWithAgent, type AgentAnalysisResult } from '@/lib/ai/agents/analyze'
import { searchKnowledge } from '@/lib/ai/rag/vector-search'
import { readTimeoutMs, buildMedicalProfileContext, type AgentOutput } from './pipeline'

const LIVING_ANALYSIS_PROMPT = `Realize uma análise funcional e integrativa **focada e concisa** dos dados fornecidos.

**Modo:** Análise contínua (documento vivo). Aborde apenas biomarcadores com desvio funcional ou tendências relevantes — **não descreva marcadores dentro da normalidade** se não houver nada clinicamente significativo a destacar.

**Processo interno (não escreva os passos):**
1. Identifique desvios das faixas funcionais otimizadas (não apenas referências laboratoriais)
2. Correlacione padrões sistêmicos e causas-raiz (ex: resistência à insulina → dislipidemia)
3. Compare com a análise anterior se disponível; use ↑↓= para indicar direção
4. Fundamente com a base de conhecimento apenas quando agregar insight novo
5. Priorize pelo impacto no objetivo de saúde declarado pelo paciente

**Formato de saída obrigatório em Markdown:**

## Resumo
4-6 linhas com os 3-5 achados mais relevantes e uma frase conectando ao objetivo do paciente.

## Principais Achados
Biomarcadores fora do ideal funcional, agrupados por sistema (Metabólico/Cardiovascular, Hormonal, Renal, Nutricional, etc.). Para cada achado: **Nome (valor)** — interpretação funcional em 1-2 frases. Inclua ↑↓= vs análise anterior quando disponível. **Omita marcadores normais sem relevância clínica.**

## Evolução
*(Apenas quando há análise anterior)* Bullet list de mudanças significativas: ↑ melhora / ↓ piora / = estável. Máximo 6 itens.

## Prioridades
3 pontos críticos ordenados por impacto, com justificativa em 1 linha cada.

## Recomendações
3-5 estratégias educacionais específicas e acionáveis fundamentadas na base de conhecimento. Evite generalidades vagas.

**Restrições de saída:**
- Limite: 900-1200 palavras no total
- Não repita informações entre seções
- Não liste marcadores normais sem relevância
- Não afirme que análise anterior não foi fornecida quando o bloco estiver presente
- Não inclua aviso médico no início (o sistema já adiciona automaticamente)`

const DISCLAIMER_TEXT =
  'Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional. Consulte sempre um médico qualificado.'

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}\n\n[conteudo truncado para manter consistencia da analise]`
}

export async function runLivingAnalysis(
  userId: string,
  triggerDocumentId: string,
  livingAnalysisId: string,
  versionId: string,
): Promise<void> {
  const startMs = Date.now()
  const hardTimeoutMs = readTimeoutMs('COMPLETE_ANALYSIS_TIMEOUT_MS', 360_000)
  const foundationTimeoutMs = readTimeoutMs('FOUNDATION_AGENT_TIMEOUT_MS', 180_000)
  const specializedTimeoutMs = readTimeoutMs('SPECIALIZED_AGENT_TIMEOUT_MS', 45_000)

  const [existingLivingAnalysis] = await db
    .select({
      reportMarkdown: livingAnalyses.reportMarkdown,
      currentVersion: livingAnalyses.currentVersion,
    })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.id, livingAnalysisId))
    .limit(1)

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

    // Keep previous context compact to avoid prompt bloat and repetitive outputs.
    const previousAnalysisContext = previousVersion?.reportMarkdown
      ? truncateText(previousVersion.reportMarkdown, 5000)
      : ''

    const medicalProfileContext = await buildMedicalProfileContext(userId)

    const foundationAgents = await getActiveAgentsByRole('foundation')
    const specializedAgents = await getActiveAgentsByRole('specialized')

    if (foundationAgents.length === 0) {
      throw new Error('No active foundation agents configured')
    }

    // Pre-fetch RAG knowledge using biomarker names from the snapshot so the
    // query targets actual content in the knowledge base (hormones, lipids, etc.)
    // rather than generic specialty/objective terms.
    const prebuiltKnowledgeContext = await (async () => {
      try {
        const ragTerms: string[] = []

        try {
          const snapshot = JSON.parse(snapshotContext) as Record<string, unknown>
          const biomarkerNames = Object.keys(snapshot).slice(0, 20).join(' ')
          if (biomarkerNames) ragTerms.push(biomarkerNames)
        } catch {
          // non-blocking
        }

        try {
          const profileObj = JSON.parse(medicalProfileContext) as Record<string, unknown>
          if (typeof profileObj.healthObjectives === 'string' && profileObj.healthObjectives) {
            ragTerms.push(profileObj.healthObjectives)
          }
        } catch {
          // non-blocking
        }

        if (ragTerms.length === 0) return undefined

        const chunks = await searchKnowledge(ragTerms.join(' '), 8)
        return chunks.length > 0 ? chunks.map((c) => c.content).join('\n\n') : undefined
      } catch {
        return undefined
      }
    })()

    const agentOutputs: AgentOutput[] = []
    const foundationOutputs: AgentOutput[] = []
    const globalDeadline = startMs + hardTimeoutMs

    for (const agent of foundationAgents) {
      if (!agent.isActive) continue
      if (Date.now() >= globalDeadline) break

      const foundationContexts = [
        {
          snapshotContext,
          medicalProfileContext,
          previousAnalysisContext,
          knowledgeContext: prebuiltKnowledgeContext,
        },
        {
          snapshotContext,
          medicalProfileContext,
          previousAnalysisContext: truncateText(previousAnalysisContext, 1800),
          knowledgeContext: prebuiltKnowledgeContext,
        },
      ]

      let result: AgentAnalysisResult = {
        content: '',
        ragContextUsed: false,
        tokensUsed: null,
        durationMs: null,
        status: 'timeout',
      }

      for (const context of foundationContexts) {
        if (Date.now() >= globalDeadline) break

        const remainingMs = globalDeadline - Date.now()
        const timeoutMs = Math.min(foundationTimeoutMs, remainingMs)
        if (timeoutMs <= 0) break

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

        try {
          result = await analyzeWithAgent(
            agent,
            LIVING_ANALYSIS_PROMPT,
            context,
            controller.signal,
          )
        } finally {
          clearTimeout(timeoutId)
        }

        if (result.status === 'completed') break
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
      if (!agent.isActive) return
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
            knowledgeContext: prebuiltKnowledgeContext,
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

    if (foundationOutputs.length === 0) {
      throw new Error('No completed foundation output to build user-facing report')
    }

    const primaryFoundationReport = foundationOutputs[0].content.trim()
    const reportMarkdown = `${primaryFoundationReport}\n\n---\n\n> ${DISCLAIMER_TEXT}`

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

    const hasPreviousReport = Boolean(existingLivingAnalysis?.reportMarkdown?.trim())

    await db
      .update(livingAnalyses)
      .set({
        status: hasPreviousReport ? 'completed' : 'failed',
        currentVersion: existingLivingAnalysis?.currentVersion ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(livingAnalyses.id, livingAnalysisId))

    console.error('[living-analysis] Error:', error)
    throw error
  }
}
