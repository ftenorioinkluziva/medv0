import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import {
  snapshots,
  analyses,
  livingAnalyses,
  livingAnalysisVersions,
  generatedProducts,
} from '@/lib/db/schema'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'
import { analyzeWithAgent } from '@/lib/ai/agents/analyze'
import { resolveAgentPrompt } from '@/lib/ai/agents/prompts'
import { logger } from '@/lib/observability/logger'
import {
  readTimeoutMs,
  buildMedicalProfileContext,
  runFoundationPhase,
  runSpecializedPhase,
  type AgentOutput,
} from './pipeline'

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

const PRODUCT_GENERATOR_PROMPT_BASE = `Com base nas análises foundation e especializadas fornecidas, e no perfil clínico do paciente, gere o produto de saúde estruturado conforme o output_schema definido para este agente.

Considere:
- Análises foundation: visão sistêmica integrada do estado de saúde
- Análises especializadas: insights por especialidade (nutrição, exercício, cardiologia, etc.)
- Perfil clínico: dados biométricos, condições médicas, medicamentos, alergias, objetivos

Responda EXCLUSIVAMENTE no formato JSON do output_schema. Não inclua texto fora do JSON.`

const PRODUCT_MEALS_REQUIREMENTS = `

Requisitos adicionais obrigatórios para plano alimentar:
- Use obrigatoriamente o campo basalMetabolicRate (TMB) do perfil clínico como base de cálculo calórico diário.
- Ajuste a meta calórica com base no objetivo de saúde (déficit para perda de gordura, superávit para ganho de massa, manutenção quando aplicável).
- Reflita os achados clínicos mais relevantes das análises em escolhas alimentares e distribuição de macros.
- Em cada item de weekly_plan.meals, inclua no mínimo: breakfast, morning_snack, lunch, afternoon_snack e dinner.
- Não retorne plano parcial com apenas 1-2 refeições por dia.
`

function buildProductGeneratorPrompt(productType: string): string {
  if (productType === 'meals') {
    return `${PRODUCT_GENERATOR_PROMPT_BASE}${PRODUCT_MEALS_REQUIREMENTS}`
  }

  return PRODUCT_GENERATOR_PROMPT_BASE
}

const REQUIRED_DAILY_MEALS = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'] as const

function parseJsonObject(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function isCompleteMealsProduct(content: Record<string, unknown>): boolean {
  const weeklyPlan = content.weekly_plan
  if (!Array.isArray(weeklyPlan) || weeklyPlan.length === 0) return false

  return weeklyPlan.every((day) => {
    if (!day || typeof day !== 'object') return false
    const meals = (day as { meals?: unknown }).meals
    if (!meals || typeof meals !== 'object') return false

    return REQUIRED_DAILY_MEALS.every((mealKey) => {
      const meal = (meals as Record<string, unknown>)[mealKey]
      return Boolean(meal && typeof meal === 'object')
    })
  })
}

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
  const hardTimeoutMs = readTimeoutMs('COMPLETE_ANALYSIS_TIMEOUT_MS', 600_000)
  const foundationTimeoutMs = readTimeoutMs('FOUNDATION_AGENT_TIMEOUT_MS', 180_000)
  const specializedTimeoutMs = readTimeoutMs('SPECIALIZED_AGENT_TIMEOUT_MS', 180_000)

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

    // Knowledge context is fetched per-agent inside analyzeWithAgent using each
    // agent's specialty + agentId filter, ensuring foundation and specialized agents
    // receive distinct, role-appropriate knowledge from the RAG system.

    const globalDeadline = startMs + hardTimeoutMs
    const foundationPhase = await runFoundationPhase({
      agents: foundationAgents,
      globalDeadline,
      timeoutMs: foundationTimeoutMs,
      buildContexts: () => [
        {
          snapshotContext,
          medicalProfileContext,
          previousAnalysisContext,
        },
        {
          snapshotContext,
          medicalProfileContext,
          previousAnalysisContext: truncateText(previousAnalysisContext, 1800),
        },
      ],
      analyze: (agent, context, signal) =>
        analyzeWithAgent(
          agent,
          resolveAgentPrompt(agent, { basePrompt: LIVING_ANALYSIS_PROMPT, isLivingAnalysis: true }),
          context,
          signal,
        ),
      persist: (agent, result) =>
        db.insert(analyses).values({
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
        }),
      shouldSkipAgent: (agent) => !agent.isActive,
    })

    const agentOutputs: AgentOutput[] = [...foundationPhase.allOutputs]

    const foundationContext = foundationPhase.completedOutputs
      .map((o) => `### ${o.agentName}\n${o.content}`)
      .join('\n\n')

    const specializedPhase = await runSpecializedPhase({
      agents: specializedAgents,
      globalDeadline,
      timeoutMs: specializedTimeoutMs,
      buildContexts: () => [
        {
          snapshotContext,
          medicalProfileContext,
          foundationContext,
          previousAnalysisContext,
        },
      ],
      analyze: (agent, context, signal) =>
        analyzeWithAgent(
          agent,
          resolveAgentPrompt(agent, { basePrompt: LIVING_ANALYSIS_PROMPT, isLivingAnalysis: true }),
          context,
          signal,
        ),
      persist: (agent, result) =>
        db.insert(analyses).values({
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
        }),
      shouldSkipAgent: (agent) => !agent.isActive,
    })

    agentOutputs.push(...specializedPhase.allOutputs)

    // Phase 3: Product Generators (parallel, non-blocking — failures don't affect report)
    const productAgents = await getActiveAgentsByRole('product_generator')
    if (productAgents.length > 0 && specializedPhase.completedOutputs.length > 0) {
      const consolidatedContext = [
        ...foundationPhase.completedOutputs.map((o) => `### ${o.agentName} (foundation)\n${o.content}`),
        ...specializedPhase.completedOutputs.map((o) => `### ${o.agentName} (specialized)\n${o.content}`),
      ].join('\n\n')

      await Promise.allSettled(
        productAgents.map(async (agent) => {
          const productType = resolveProductType(agent.name)
          const [productRow] = await db
            .insert(generatedProducts)
            .values({
              userId,
              livingAnalysisVersionId: versionId,
              agentId: agent.id,
              productType,
              status: 'processing',
            })
            .returning({ id: generatedProducts.id })

          const productId = productRow?.id
          if (!productId) return

          const productTimeoutMs = readTimeoutMs('PRODUCT_GENERATOR_TIMEOUT_MS', 120_000)
          const remainingMs = Math.max(0, globalDeadline - Date.now())
          const timeoutMs = Math.min(productTimeoutMs, remainingMs)

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

          try {
            const initialResult = await analyzeWithAgent(
              agent,
              buildProductGeneratorPrompt(productType),
              {
                snapshotContext,
                medicalProfileContext,
                foundationContext: consolidatedContext,
              },
              controller.signal,
            )

            let result = initialResult

            if (productType === 'meals' && result.status === 'completed' && result.content) {
              const parsed = parseJsonObject(result.content)
              const complete = parsed ? isCompleteMealsProduct(parsed) : false

              if (!complete) {
                result = await analyzeWithAgent(
                  agent,
                  `${buildProductGeneratorPrompt(productType)}\n\nTentativa de correção: a resposta anterior veio incompleta. Retorne novamente um weekly_plan completo com todas as refeições obrigatórias por dia.`,
                  {
                    snapshotContext,
                    medicalProfileContext,
                    foundationContext: consolidatedContext,
                  },
                  controller.signal,
                )
              }
            }

            clearTimeout(timeoutId)

            if (result.status === 'completed' && result.content) {
              const parsedContent = parseJsonObject(result.content)
              const isMealsComplete = productType === 'meals'
                ? Boolean(parsedContent && isCompleteMealsProduct(parsedContent))
                : true
              const isCompleted = Boolean(parsedContent) && isMealsComplete
              const errorMessage = !parsedContent
                ? 'Invalid JSON output from agent'
                : !isMealsComplete
                  ? 'Incomplete meals weekly_plan: missing required meals in one or more days'
                  : null

              await db
                .update(generatedProducts)
                .set({
                  content: parsedContent,
                  status: isCompleted ? 'completed' : 'failed',
                  errorMessage,
                  tokensUsed: result.tokensUsed,
                  durationMs: result.durationMs,
                  updatedAt: new Date(),
                })
                .where(eq(generatedProducts.id, productId))
            } else {
              await db
                .update(generatedProducts)
                .set({
                  status: 'failed',
                  errorMessage: result.errorMessage ?? `Agent status: ${result.status}`,
                  tokensUsed: result.tokensUsed,
                  durationMs: result.durationMs,
                  updatedAt: new Date(),
                })
                .where(eq(generatedProducts.id, productId))
            }
          } catch (err) {
            clearTimeout(timeoutId)
            await db
              .update(generatedProducts)
              .set({
                status: 'failed',
                errorMessage: err instanceof Error ? err.message : String(err),
                updatedAt: new Date(),
              })
              .where(eq(generatedProducts.id, productId))
          }
        }),
      )
    }

    if (foundationPhase.completedOutputs.length === 0) {
      throw new Error('No completed foundation output to build user-facing report')
    }

    const primaryFoundationReport = foundationPhase.completedOutputs[0].content.trim()

    // Specialized outputs are displayed as separate cards in the frontend via the
    // analyses table — do not embed them in reportMarkdown to avoid duplication.
    const reportMarkdown = `${primaryFoundationReport}\n\n---\n\n> ${DISCLAIMER_TEXT}`

    const foundationCompleted = foundationPhase.completedOutputs.length
    const specializedCompleted = specializedPhase.completedOutputs.length

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

    logger.error('[living-analysis] Error', error)
    throw error
  }
}

function resolveProductType(agentName: string): string {
  const lower = agentName.toLowerCase()
  if (lower.includes('suplementa')) return 'supplementation'
  if (lower.includes('alimentar') || lower.includes('meal')) return 'meals'
  if (lower.includes('treino') || lower.includes('workout')) return 'workout'
  return 'other'
}
