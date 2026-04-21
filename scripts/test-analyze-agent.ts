import 'dotenv/config'
import { db } from '@/lib/db/client'
import { eq, desc } from 'drizzle-orm'
import { getActiveAgentsByRole } from '@/lib/db/queries/health-agents'
import { analyzeWithAgent } from '@/lib/ai/agents/analyze'
import { snapshots } from '@/lib/db/schema'
import { exit } from 'process'

async function main() {
  const [userId, agentId] = process.argv.slice(2)
  if (!userId || !agentId) {
    console.error('Uso: pnpm tsx scripts/test-analyze-agent.ts <userId> <agentId>')
    exit(1)
  }

  // Busca agentes ativos de todos os roles
  const agents = [
    ...(await getActiveAgentsByRole('foundation')),
    ...(await getActiveAgentsByRole('specialized')),
  ]
  const agent = agents.find(a => a.id === agentId)
  if (!agent) {
    console.error('Agente não encontrado ou está inativo:', agentId)
    exit(1)
  }

  // Busca o snapshot/documento mais recente do usuário
  const [snapshot] = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.userId, userId))
    .orderBy(desc(snapshots.createdAt))
    .limit(1)

  if (!snapshot) {
    console.error('Nenhum snapshot encontrado para o usuário:', userId)
    exit(1)
  }

  // Monta o contexto (ajuste conforme necessário)
  const context = {
    snapshotContext: JSON.stringify(snapshot.structuredData),
    medicalProfileContext: '',
    knowledgeContext: '',
  }

  // Prompt padrão (ajuste se quiser)
  const prompt = 'Realize uma análise funcional e integrativa dos dados fornecidos.'

  // Executa a análise
  const result = await analyzeWithAgent(agent, prompt, context)
  console.log('Resultado:', result)
}

main().catch(console.error)