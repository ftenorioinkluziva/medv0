import { generateText } from 'ai'
import { desc, eq } from 'drizzle-orm'
import { resolveModel } from '@/lib/ai/core/resolve-model'

const DEFAULT_SYNTHESIS_MODEL = 'google/gemini-2.5-flash'
import { db } from '@/lib/db/client'
import type { AgentAnalysisResult } from '@/lib/ai/agents/analyze'
import type { HealthAgent } from '@/lib/db/schema'
import { bodyCompositionHistory, documents, medicalProfiles, snapshots } from '@/lib/db/schema'
import { logger } from '@/lib/observability/logger'

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function normalizeGender(value: string | null | undefined): string | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()
  if (normalized === 'm' || normalized === 'male' || normalized === 'masculino') return 'masculino'
  if (normalized === 'f' || normalized === 'female' || normalized === 'feminino') return 'feminino'
  if (normalized === 'outro' || normalized === 'other') return 'outro'

  return value.trim()
}

function calculateBasalMetabolicRate(params: {
  weight: unknown
  height: unknown
  age: unknown
  gender: string | null | undefined
}): number | null {
  const weightKg = toNumberOrNull(params.weight)
  const heightCm = toNumberOrNull(params.height)
  const age = toNumberOrNull(params.age)
  const gender = normalizeGender(params.gender)

  if (!weightKg || !heightCm || !age || !gender) return null

  const isMale = gender === 'masculino'
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (isMale ? 5 : -161))
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

    if (result.status === 'completed') {
      if (result.content.trim().length < 100) {
        result = {
          ...result,
          content: '',
          status: 'timeout',
          errorMessage: result.errorMessage ?? 'Content below minimum length threshold after completion',
        }
      } else {
        break
      }
    }
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
  if (!rawModel) return DEFAULT_SYNTHESIS_MODEL

  const normalized = rawModel.trim()
  const slashIndex = normalized.indexOf('/')

  if (slashIndex <= 0 || slashIndex === normalized.length - 1) {
    logger.warn(
      `[synthesis] Invalid SYNTHESIS_MODEL "${rawModel}", falling back to ${DEFAULT_SYNTHESIS_MODEL}`,
    )
    return DEFAULT_SYNTHESIS_MODEL
  }

  return normalized
}

export async function buildMedicalProfileContext(userId: string): Promise<string> {
  const [profile] = await db
    .select()
    .from(medicalProfiles)
    .where(eq(medicalProfiles.userId, userId))
    .limit(1)

  const [latestBodyComposition] = await db
    .select()
    .from(bodyCompositionHistory)
    .where(eq(bodyCompositionHistory.userId, userId))
    .orderBy(desc(bodyCompositionHistory.createdAt))
    .limit(1)

  const snapshotRows = await db
    .select({
      structuredData: snapshots.structuredData,
      category: documents.category,
    })
    .from(snapshots)
    .innerJoin(documents, eq(documents.id, snapshots.documentId))
    .where(eq(snapshots.userId, userId))
    .orderBy(desc(snapshots.createdAt))
    .limit(5)

  const snapshotsWithPatientInfo = snapshotRows.filter((row) => {
    const patientInfo = asRecord(asRecord(row.structuredData)?.patientInfo)
    return patientInfo && (patientInfo.age !== undefined || patientInfo.gender !== undefined)
  })

  const bestSnapshot = snapshotsWithPatientInfo.find((row) => row.category !== 'bioimpedance')
    ?? snapshotsWithPatientInfo[0]

  const snapshotPatientInfo = asRecord(asRecord(bestSnapshot?.structuredData)?.patientInfo)
  const fallbackAge = toNumberOrNull(snapshotPatientInfo?.age)
  const fallbackGender = normalizeGender(toStringOrNull(snapshotPatientInfo?.gender))

  if (!profile) {
    const fallbackContext = {
      age: fallbackAge,
      gender: fallbackGender,
      height: null,
      weight: latestBodyComposition?.weight ?? null,
      bodyFatPercentage: latestBodyComposition?.bodyFat ?? null,
      muscleMass: latestBodyComposition?.muscleMass ?? null,
      basalMetabolicRate: latestBodyComposition?.bmr ?? null,
      currentDiet: null,
      dailyWaterIntake: null,
      systolicPressure: null,
      diastolicPressure: null,
      restingHeartRate: null,
      healthObjectives: null,
      medicalConditions: null,
      medications: null,
      allergies: null,
      exerciseActivities: null,
      exerciseFrequency: null,
      exerciseDuration: null,
      exerciseIntensity: null,
      physicalLimitations: null,
      contextSource: 'document_fallback',
    }

    return JSON.stringify(fallbackContext)
  }

  const age = profile.age ?? fallbackAge
  const gender = normalizeGender(profile.gender) ?? fallbackGender
  let basalMetabolicRate = profile.basalMetabolicRate ?? latestBodyComposition?.bmr ?? null

  if (!basalMetabolicRate) {
    basalMetabolicRate = calculateBasalMetabolicRate({
      weight: profile.weight,
      height: profile.height,
      age,
      gender,
    })
  }

  return JSON.stringify({
    age,
    gender,
    height: profile.height,
    weight: profile.weight,
    bodyFatPercentage: profile.bodyFatPercentage,
    muscleMass: profile.muscleMass,
    basalMetabolicRate,
    currentDiet: profile.currentDiet,
    dailyWaterIntake: profile.dailyWaterIntake,
    systolicPressure: profile.systolicPressure,
    diastolicPressure: profile.diastolicPressure,
    restingHeartRate: profile.restingHeartRate,
    healthObjectives: profile.healthObjectives,
    medicalConditions: profile.medicalConditions,
    medications: profile.medications,
    allergies: profile.allergies,
    exerciseActivities: profile.exerciseActivities,
    exerciseFrequency: profile.exerciseFrequency,
    exerciseDuration: profile.exerciseDuration,
    exerciseIntensity: profile.exerciseIntensity,
    physicalLimitations: profile.physicalLimitations,
    contextSource: 'medical_profile',
  })
}
