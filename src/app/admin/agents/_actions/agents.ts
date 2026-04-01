'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { healthAgents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getAgentById, countActiveFoundationAgents } from '@/lib/db/queries/health-agents'

const AgentSchema = z.object({
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
    .transform((v) => (v === '' || v === undefined ? null : parseInt(v, 10))),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
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
  }
}

export async function createAgentAction(formData: FormData): Promise<ActionResult> {
  const parsed = AgentSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

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
  })

  revalidatePath('/admin/agents')
  redirect('/admin/agents')
}

export async function updateAgentAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const agent = await getAgentById(id)
  if (!agent) return { error: 'Agente não encontrado' }

  const parsed = AgentSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const isChangingFromFoundation =
    agent.analysisRole === 'foundation' && parsed.data.analysisRole !== 'foundation'

  if (isChangingFromFoundation && agent.isActive) {
    const foundationCount = await countActiveFoundationAgents()
    if (foundationCount <= 1) {
      return {
        error:
          'Pelo menos 1 agente foundation deve estar ativo. Não é possível alterar o role do único foundation ativo.',
      }
    }
  }

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

  await db.delete(healthAgents).where(eq(healthAgents.id, id))

  revalidatePath('/admin/agents')
  return { success: true }
}
