import { generateText } from 'ai'
import { eq } from 'drizzle-orm'
import { resolveModel } from '@/lib/ai/core/resolve-model'
import { db } from '@/lib/db/client'
import type { AgentAnalysisResult } from '@/lib/ai/agents/analyze'
import type { HealthAgent } from '@/lib/db/schema'
import { medicalProfiles } from '@/lib/db/schema'

export interface AgentOutput {
  agentId: string
  agentName: string
  role: string
  content: string
  status: 'completed' | 'timeout' | 'error'
}

export interface FoundationPhaseResult {
  allOutputs: AgentOutput[]
  completedOutputs: AgentOutput[]
}

interface BasePhaseParams<ContextType> {
  agents: HealthAgent[]
  globalDeadline: number
  timeoutMs: number
  buildContexts: (agent: HealthAgent) => ContextType[]
  analyze: (
    agent: HealthAgent,
    context: ContextType,
    signal: AbortSignal,
  ) => Promise<AgentAnalysisResult>
  persist: (agent: HealthAgent, result: AgentAnalysisResult) => Promise<unknown>
  shouldSkipAgent?: (agent: HealthAgent) => boolean
}

interface SpecializedPhaseParams<ContextType> {
  agents: HealthAgent[]
  globalDeadline: number
  timeoutMs: number
  buildContexts: (agent: HealthAgent) => ContextType[]
  analyze: (
    agent: HealthAgent,
    context: ContextType,
    signal: AbortSignal,
  ) => Promise<AgentAnalysisResult>
  persist: (agent: HealthAgent, result: AgentAnalysisResult) => Promise<unknown>
  shouldSkipAgent?: (agent: HealthAgent) => boolean
}

interface SynthesisParams {
  outputs: AgentOutput[]
  snapshotContext: string
  globalDeadline: number
  synthesisTimeoutMs: number
  synthesisPrompt: string
  disclaimerText: string
  synthesisModel?: string
  validate?: (reportMarkdown: string) => void
}

export function readTimeoutMs(envName: string, fallbackMs: number): number {
  const rawValue = process.env[envName]
  if (!rawValue) return fallbackMs

  const parsed = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsed) || parsed <= 0) return fallbackMs

  return parsed
}

function toAgentOutput(agent: HealthAgent, result: AgentAnalysisResult): AgentOutput {
  return {
    agentId: agent.id,
    agentName: agent.name,
    role: agent.analysisRole,
    content: result.content,
    status: result.status,
  }
}

function fallbackTimeoutResult(): AgentAnalysisResult {
  return {
    content: '',
    ragContextUsed: false,
    tokensUsed: null,
    durationMs: null,
    status: 'timeout',
  }
}

async function runAgentWithContexts<ContextType>(
  params: BasePhaseParams<ContextType>,
  agent: HealthAgent,
): Promise<AgentAnalysisResult | null> {
  if (params.shouldSkipAgent?.(agent)) return null
  if (Date.now() >= params.globalDeadline) return null

  const contexts = params.buildContexts(agent)
  let result: AgentAnalysisResult = fallbackTimeoutResult()

  for (const context of contexts) {
    if (Date.now() >= params.globalDeadline) break

    const remainingMs = params.globalDeadline - Date.now()
    const timeoutMs = Math.min(params.timeoutMs, remainingMs)
    if (timeoutMs <= 0) break

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      result = await params.analyze(agent, context, controller.signal)
    } catch {
      result = fallbackTimeoutResult()
    } finally {
      clearTimeout(timeoutId)
    }

    if (result.status === 'completed') break
  }

  await params.persist(agent, result)
  return result
}

export async function runFoundationPhase<ContextType>(
  params: BasePhaseParams<ContextType>,
): Promise<FoundationPhaseResult> {
  const allOutputs: AgentOutput[] = []
  const completedOutputs: AgentOutput[] = []

  for (const agent of params.agents) {
    const result = await runAgentWithContexts(params, agent)
    if (!result) continue

    const output = toAgentOutput(agent, result)
    allOutputs.push(output)
    if (result.status === 'completed') completedOutputs.push(output)
  }

  return { allOutputs, completedOutputs }
}

export async function runSpecializedPhase<ContextType>(
  params: SpecializedPhaseParams<ContextType>,
): Promise<FoundationPhaseResult> {
  const tasks = params.agents.map(async (agent) => {
    const result = await runAgentWithContexts(params, agent)
    if (!result) return null
    return toAgentOutput(agent, result)
  })

  const settled = await Promise.allSettled(tasks)
  const allOutputs: AgentOutput[] = []
  const completedOutputs: AgentOutput[] = []

  for (const item of settled) {
    if (item.status !== 'fulfilled' || !item.value) continue

    allOutputs.push(item.value)
    if (item.value.status === 'completed') completedOutputs.push(item.value)
  }

  return { allOutputs, completedOutputs }
}

export async function runSynthesisPhase(params: SynthesisParams): Promise<string> {
  if (params.outputs.length === 0) {
    throw new Error('runSynthesisPhase: no agent outputs available for synthesis')
  }

  const synthesisInput = params.outputs
    .map((output) => `## Análise: ${output.agentName}\n${output.content}`)
    .join('\n\n---\n\n')

  const fallbackReport = `${synthesisInput}\n\n---\n\n> ${params.disclaimerText}`
  const remainingMs = params.globalDeadline - Date.now()

  if (remainingMs <= 5_000) return fallbackReport

  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    Math.min(params.synthesisTimeoutMs, remainingMs),
  )

  try {
    const { text } = await generateText({
      model: resolveModel(resolveSynthesisModel(params.synthesisModel ?? process.env.SYNTHESIS_MODEL)),
      system: params.synthesisPrompt,
      prompt: `Snapshot de biomarcadores (use para indicadores ↑↓⚠):\n${params.snapshotContext}\n\nConsolide as seguintes análises especializadas em um relatório integrado:\n\n${synthesisInput}`,
      abortSignal: controller.signal,
    })

    const reportMarkdown = `${text}\n\n---\n\n> ${params.disclaimerText}`
    params.validate?.(reportMarkdown)
    return reportMarkdown
  } catch {
    return fallbackReport
  } finally {
    clearTimeout(timeoutId)
  }
}

function resolveSynthesisModel(rawModel?: string): string {
  const fallback = 'google/gemini-2.5-flash'
  if (!rawModel) return fallback

  const normalized = rawModel.trim()
  const slashIndex = normalized.indexOf('/')

  if (slashIndex <= 0 || slashIndex === normalized.length - 1) {
    console.warn(
      `[synthesis] Invalid SYNTHESIS_MODEL "${rawModel}", falling back to ${fallback}`,
    )
    return fallback
  }

  return normalized
}

export async function buildMedicalProfileContext(userId: string): Promise<string> {
  const [profile] = await db
    .select()
    .from(medicalProfiles)
    .where(eq(medicalProfiles.userId, userId))
    .limit(1)

  if (!profile) return '{}'

  return JSON.stringify({
    age: profile.age,
    gender: profile.gender,
    height: profile.height,
    weight: profile.weight,
    systolicPressure: profile.systolicPressure,
    diastolicPressure: profile.diastolicPressure,
    restingHeartRate: profile.restingHeartRate,
    healthObjectives: profile.healthObjectives,
    medicalConditions: profile.medicalConditions,
    exerciseActivities: profile.exerciseActivities,
    exerciseFrequency: profile.exerciseFrequency,
    exerciseDuration: profile.exerciseDuration,
    exerciseIntensity: profile.exerciseIntensity,
    physicalLimitations: profile.physicalLimitations,
  })
}
