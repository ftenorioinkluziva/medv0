'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { analyses, healthAgents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getAgentById, countActiveFoundationAgents } from '@/lib/db/queries/health-agents'
import { requireAdmin, UnauthorizedError } from '@/lib/auth/require-admin'


const AgentSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    specialty: z.string().min(1, 'Especialidade é obrigatória'),
    description: z.string().optional(),
    systemPrompt: z.string().min(50, 'System prompt deve ter no mínimo 50 caracteres'),
    analysisRole: z.enum(['foundation', 'specialized', 'none']),
    model: z.string().min(1, 'Modelo é obrigatório'),
    temperature: z.coerce.number().min(0).max(1),
    maxTokens: z
      .string()
      .optional()
      .transform((v) => {
        if (v === '' || v === undefined) return null
        return /^\d+$/.test(v) ? parseInt(v, 10) : null
      }),
    sortOrder: z.coerce.number().int().min(0),
    isActive: z.boolean(),
    outputType: z.enum(['text', 'structured']).default('text'),
    outputSchema: z.string().optional().transform((v) => (v === '' ? undefined : v)),
    modelConfig: z.string().optional().transform((v) => (v === '' ? undefined : v)),
  })
  .superRefine((data, ctx) => {
    if (data.outputType === 'structured') {
      if (!data.outputSchema) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Output Schema obrigatório para agentes estruturados',
          path: ['outputSchema'],
        })
        return
      }
      try {
        JSON.parse(data.outputSchema)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Output Schema deve ser JSON válido',
          path: ['outputSchema'],
        })
      }
    }
    if (data.modelConfig) {
      try {
        JSON.parse(data.modelConfig)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Model Config deve ser JSON válido',
          path: ['modelConfig'],
        })
      }
    }
  })

type ActionResult = { error: string } | { success: true }

function parseFormData(formData: FormData) {
  return {
    name: String(formData.get('name') ?? ''),
    specialty: String(formData.get('specialty') ?? ''),
    description: String(formData.get('description') ?? '') || undefined,
    systemPrompt: String(formData.get('systemPrompt') ?? ''),
    analysisRole: String(formData.get('analysisRole') ?? ''),
    model: String(formData.get('model') ?? ''),
    temperature: String(formData.get('temperature') ?? '0.7'),
    maxTokens: String(formData.get('maxTokens') ?? ''),
    sortOrder: String(formData.get('sortOrder') ?? '0'),
    isActive: formData.get('isActive') === 'on',
    outputType: String(formData.get('outputType') ?? 'text'),
    outputSchema: String(formData.get('outputSchema') ?? '') || undefined,
    modelConfig: String(formData.get('modelConfig') ?? '') || undefined,
  }
}

export async function createAgentAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: 'Unauthorized' }
    throw error
  }

  const parsed = AgentSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const parsedModelConfig = parsed.data.modelConfig
    ? (JSON.parse(parsed.data.modelConfig) as Record<string, unknown>)
    : null
  const parsedOutputSchema = parsed.data.outputSchema
    ? (JSON.parse(parsed.data.outputSchema) as Record<string, unknown>)
    : null

  await db.insert(healthAgents).values({
    name: parsed.data.name,
    specialty: parsed.data.specialty,
    description: parsed.data.description,
    systemPrompt: parsed.data.systemPrompt,
    analysisRole: parsed.data.analysisRole,
    model: parsed.data.model,
    temperature: String(parsed.data.temperature),
    maxTokens: parsed.data.maxTokens,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
    outputType: parsed.data.outputType,
    outputSchema: parsedOutputSchema,
    modelConfig: parsedModelConfig,
  })

  revalidatePath('/admin/agents')
  redirect('/admin/agents')
}

export async function updateAgentAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: 'Unauthorized' }
    throw error
  }

  const agent = await getAgentById(id)
  if (!agent) return { error: 'Agente não encontrado' }

  const parsed = AgentSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const isChangingFromFoundation =
    agent.analysisRole === 'foundation' && parsed.data.analysisRole !== 'foundation'
  const isDeactivatingFoundation =
    agent.analysisRole === 'foundation' && agent.isActive && parsed.data.isActive === false

  if ((isChangingFromFoundation && agent.isActive) || isDeactivatingFoundation) {
    const foundationCount = await countActiveFoundationAgents()
    if (foundationCount <= 1) {
      return {
        error:
          'Pelo menos 1 agente foundation deve estar ativo. Não é possível alterar o role do único foundation ativo.',
      }
    }
  }

  const parsedModelConfigUpdate = parsed.data.modelConfig
    ? (JSON.parse(parsed.data.modelConfig) as Record<string, unknown>)
    : null
  const parsedOutputSchemaUpdate = parsed.data.outputSchema
    ? (JSON.parse(parsed.data.outputSchema) as Record<string, unknown>)
    : null

  await db
    .update(healthAgents)
    .set({
      name: parsed.data.name,
      specialty: parsed.data.specialty,
      description: parsed.data.description,
      systemPrompt: parsed.data.systemPrompt,
      analysisRole: parsed.data.analysisRole,
      model: parsed.data.model,
      temperature: String(parsed.data.temperature),
      maxTokens: parsed.data.maxTokens,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      outputType: parsed.data.outputType,
      outputSchema: parsedOutputSchemaUpdate,
      modelConfig: parsedModelConfigUpdate,
      updatedAt: new Date(),
    })
    .where(eq(healthAgents.id, id))

  revalidatePath('/admin/agents')
  redirect('/admin/agents')
}

export async function toggleAgentAction(
  id: string,
  currentlyActive: boolean,
): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: 'Unauthorized' }
    throw error
  }

  if (currentlyActive) {
    const agent = await getAgentById(id)
    if (!agent) return { error: 'Agente não encontrado' }

    if (agent.analysisRole === 'foundation') {
      const foundationCount = await countActiveFoundationAgents()
      if (foundationCount <= 1) {
        return { error: 'Pelo menos 1 agente foundation deve estar ativo' }
      }
    }
  }

  await db
    .update(healthAgents)
    .set({ isActive: !currentlyActive, updatedAt: new Date() })
    .where(eq(healthAgents.id, id))

  revalidatePath('/admin/agents')
  return { success: true }
}

export async function deleteAgentAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: 'Unauthorized' }
    throw error
  }

  const agent = await getAgentById(id)
  if (!agent) return { error: 'Agente não encontrado' }

  if (agent.analysisRole === 'foundation' && agent.isActive) {
    const foundationCount = await countActiveFoundationAgents()
    if (foundationCount <= 1) {
      return {
        error:
          'Pelo menos 1 agente foundation deve estar ativo. Não é possível excluir o único foundation ativo.',
      }
    }
  }

  const linkedAnalyses = await db
    .select({ id: analyses.id })
    .from(analyses)
    .where(eq(analyses.agentId, id))
    .limit(1)

  if (linkedAnalyses.length > 0) {
    return {
      error:
        'Este agente já foi usado em análises e não pode ser excluído. Desative-o para impedir novos usos.',
    }
  }

  try {
    await db.delete(healthAgents).where(eq(healthAgents.id, id))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes('analyses_agent_id_health_agents_id_fk') ||
      message.includes('violates foreign key constraint')
    ) {
      return {
        error:
          'Este agente já foi usado em análises e não pode ser excluído. Desative-o para impedir novos usos.',
      }
    }
    return { error: 'Não foi possível excluir o agente no momento.' }
  }

  revalidatePath('/admin/agents')
  return { success: true }
}
