import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

vi.mock('@/lib/ai/core/resolve-model', () => ({
  resolveModel: vi.fn((model: string) => `resolved:${model}`),
}))

vi.mock('@/lib/ai/rag/vector-search', () => ({
  searchKnowledge: vi.fn().mockResolvedValue([]),
}))

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'mock text result',
    usage: { totalTokens: 100 },
  }),
  generateObject: vi.fn().mockResolvedValue({
    object: {
      overview: 'Plano para iniciantes',
      weeklyGoal: 'Melhorar condicionamento cardiovascular',
      workouts: [
        {
          day: 'Segunda',
          type: 'Cardio',
          duration: '30 min',
          warmup: '5 min caminhada',
          exercises: [{ name: 'Caminhada acelerada', sets: 1, reps: '30 min' }],
          cooldown: '5 min alongamento',
        },
      ],
      restDays: ['Quarta', 'Domingo'],
      progressionTips: ['Aumente 5 min por semana'],
    },
    usage: { totalTokens: 200 },
  }),
  jsonSchema: vi.fn((schema: unknown) => schema),
}))

import { generateObject, generateText } from 'ai'
import { db } from '@/lib/db/client'
import { seedHealthAgents } from '@/lib/db/seed/health-agents'
import { analyzeWithAgent } from '@/lib/ai/agents/analyze'
import { buildMedicalProfileContext } from '@/lib/ai/orchestrator/pipeline'
import type { HealthAgent } from '@/lib/db/schema'

function buildInsertChain() {
  const chain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(db.insert).mockReturnValue(chain as never)
  return chain
}


const workoutAgent: HealthAgent = {
  id: 'agent-workout',
  name: 'Plano de Exercícios',
  specialty: 'Exercício e Movimento',
  description: 'Gera plano de treino personalizado',
  systemPrompt: 'Você é um especialista em prescrição de exercício',
  analysisRole: 'specialized',
  model: 'google/gemini-2.5-flash',
  temperature: '0.7',
  maxTokens: null,
  modelConfig: null,
  outputType: 'structured',
  outputSchema: {
    type: 'object',
    properties: {
      overview: { type: 'string' },
      weeklyGoal: { type: 'string' },
      workouts: { type: 'array', items: { type: 'object', properties: { day: { type: 'string' }, type: { type: 'string' } }, required: ['day', 'type'] } },
      restDays: { type: 'array', items: { type: 'string' } },
      progressionTips: { type: 'array', items: { type: 'string' } },
    },
    required: ['overview', 'workouts', 'weeklyGoal'],
  },
  isActive: true,
  sortOrder: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AC1 — Seed do agente "Plano de Exercícios"', () => {
  it('deve inserir 6 agentes no total incluindo Plano de Exercícios', async () => {
    // #given
    buildInsertChain()

    // #when
    await seedHealthAgents()

    // #then
    expect(db.insert).toHaveBeenCalledTimes(6)
  })

  it('deve configurar "Plano de Exercícios" com outputType structured', async () => {
    // #given
    const chain = buildInsertChain()

    // #when
    await seedHealthAgents()

    // #then
    const insertCalls = vi.mocked(db.insert).mock.calls
    const valuesCalls = chain.values.mock.calls.map((c: unknown[]) => c[0]) as Array<{
      name: string
      outputType?: string
      outputSchema?: unknown
      analysisRole: string
    }>

    const workoutEntry = valuesCalls.find((v) => v.name === 'Plano de Exercícios')
    expect(workoutEntry).toBeDefined()
    expect(workoutEntry?.outputType).toBe('structured')
    expect(workoutEntry?.analysisRole).toBe('specialized')
    expect(insertCalls).toHaveLength(6)
  })

  it('deve definir outputSchema com propriedades obrigatórias', async () => {
    // #given
    const chain = buildInsertChain()

    // #when
    await seedHealthAgents()

    // #then
    const valuesCalls = chain.values.mock.calls.map((c: unknown[]) => c[0]) as Array<{
      name: string
      outputSchema?: { required?: string[] }
    }>
    const workoutEntry = valuesCalls.find((v) => v.name === 'Plano de Exercícios')

    expect(workoutEntry?.outputSchema).toBeDefined()
    expect(workoutEntry?.outputSchema?.required).toEqual(
      expect.arrayContaining(['overview', 'workouts', 'weeklyGoal']),
    )
  })
})

describe('AC3 — analyzeWithAgent com agente estruturado', () => {
  it('usa generateObject quando outputType é structured', async () => {
    // #given
    const context = {
      snapshotContext: '{}',
      medicalProfileContext: JSON.stringify({
        exerciseActivities: [],
        exerciseFrequency: 3,
        exerciseDuration: 45,
        physicalLimitations: 'nenhuma',
      }),
    }

    // #when
    const result = await analyzeWithAgent(workoutAgent, 'Gere um plano de treino', context)

    // #then
    expect(generateObject).toHaveBeenCalledOnce()
    expect(generateText).not.toHaveBeenCalled()
    expect(result.status).toBe('completed')
  })

  it('persiste output JSON stringified em content', async () => {
    // #given
    const context = {
      snapshotContext: '{}',
      medicalProfileContext: '{}',
    }

    // #when
    const result = await analyzeWithAgent(workoutAgent, 'Gere um plano de treino', context)

    // #then
    const parsed = JSON.parse(result.content)
    expect(parsed).toHaveProperty('overview')
    expect(parsed).toHaveProperty('weeklyGoal')
    expect(parsed).toHaveProperty('workouts')
    expect(Array.isArray(parsed.workouts)).toBe(true)
  })

  it('retorna structuredOutput com o objeto JSON gerado', async () => {
    // #given
    const context = {
      snapshotContext: '{}',
      medicalProfileContext: '{}',
    }

    // #when
    const result = await analyzeWithAgent(workoutAgent, 'Gere um plano de treino', context)

    // #then
    expect(result.structuredOutput).toBeDefined()
    expect(result.structuredOutput).toHaveProperty('overview')
    expect(result.structuredOutput).toHaveProperty('workouts')
  })

  it('passa schema correto para generateObject', async () => {
    // #given
    const context = {
      snapshotContext: '{}',
      medicalProfileContext: '{}',
    }

    // #when
    await analyzeWithAgent(workoutAgent, 'Gere um plano de treino', context)

    // #then
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: workoutAgent.outputSchema,
      }),
    )
  })
})

describe('AC3 — buildMedicalProfileContext inclui campos de exercício', () => {
  it('inclui exerciseActivities no context quando presente', async () => {
    // #given
    const mockProfile = {
      age: 35,
      gender: 'masculino',
      height: 175,
      weight: '75.00',
      systolicPressure: 120,
      diastolicPressure: 80,
      restingHeartRate: 65,
      healthObjectives: 'Melhorar condicionamento',
      medicalConditions: null,
      exerciseActivities: [{ type: 'corrida', frequency: 3, duration: 30, intensity: 'moderada' }],
      exerciseFrequency: 3,
      exerciseDuration: 30,
      exerciseIntensity: 'moderada',
      physicalLimitations: 'nenhuma',
    }
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockProfile]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    // #when
    const result = await buildMedicalProfileContext('user-123')

    // #then
    const parsed = JSON.parse(result)
    expect(parsed).toHaveProperty('exerciseActivities')
    expect(parsed).toHaveProperty('exerciseFrequency', 3)
    expect(parsed).toHaveProperty('exerciseDuration', 30)
    expect(parsed).toHaveProperty('exerciseIntensity', 'moderada')
    expect(parsed).toHaveProperty('physicalLimitations', 'nenhuma')
  })

  it('retorna {} quando perfil não existe', async () => {
    // #given
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)

    // #when
    const result = await buildMedicalProfileContext('user-sem-perfil')

    // #then
    expect(result).toBe('{}')
  })
})

describe('AC2 — Output schema do workout plan', () => {
  it('schema define required com overview, workouts e weeklyGoal', () => {
    // #given
    const schema = workoutAgent.outputSchema as { required?: string[] }

    // #then
    expect(schema.required).toEqual(
      expect.arrayContaining(['overview', 'workouts', 'weeklyGoal']),
    )
  })

  it('schema define propriedade workouts como array', () => {
    // #given
    const schema = workoutAgent.outputSchema as {
      properties: { workouts: { type: string } }
    }

    // #then
    expect(schema.properties.workouts.type).toBe('array')
  })

  it('schema define restDays e progressionTips como arrays de string', () => {
    // #given
    const schema = workoutAgent.outputSchema as {
      properties: {
        restDays: { type: string; items: { type: string } }
        progressionTips: { type: string; items: { type: string } }
      }
    }

    // #then
    expect(schema.properties.restDays.type).toBe('array')
    expect(schema.properties.restDays.items.type).toBe('string')
    expect(schema.properties.progressionTips.type).toBe('array')
    expect(schema.properties.progressionTips.items.type).toBe('string')
  })
})
