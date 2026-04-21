// scripts/delete-user-data.ts
import 'dotenv/config'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import {
  users,
  medicalProfiles,
  documents,
  snapshots,
  livingAnalyses,
  livingAnalysisVersions,
  bodyCompositionHistory,
  chatSessions,
  chatMessages,
  analyses,
  healthAgents,
  knowledgeBase,
  knowledgeEmbeddings,
  completeAnalyses,
  // adicione outros schemas se necessário
} from '@/lib/db/schema'

async function deleteUserData(userId: string) {
  // Buscar todos os documentos do usuário
  const userDocs = await db.select({ id: documents.id }).from(documents).where(eq(documents.userId, userId))
  const documentIds = userDocs.map((d) => d.id)

  // Deletar snapshots relacionados
  if (documentIds.length > 0) {
    await db.delete(snapshots).where(inArray(snapshots.documentId, documentIds)).catch(() => {})
    await db.delete(analyses).where(inArray(analyses.documentId, documentIds)).catch(() => {})
    await db.delete(bodyCompositionHistory).where(inArray(bodyCompositionHistory.documentId, documentIds)).catch(() => {})
    await db.delete(livingAnalysisVersions).where(inArray(livingAnalysisVersions.triggerDocumentId, documentIds)).catch(() => {})
    await db.delete(completeAnalyses).where(inArray(completeAnalyses.documentId, documentIds)).catch(() => {})
  }

  // Deletar livingAnalyses e versions pelo userId
  const userLivingAnalyses = await db.select({ id: livingAnalyses.id }).from(livingAnalyses).where(eq(livingAnalyses.userId, userId))
  const livingAnalysisIds = userLivingAnalyses.map((a) => a.id)
  if (livingAnalysisIds.length > 0) {
    await db.delete(livingAnalysisVersions).where(inArray(livingAnalysisVersions.livingAnalysisId, livingAnalysisIds)).catch(() => {})
    await db.delete(livingAnalyses).where(inArray(livingAnalyses.id, livingAnalysisIds)).catch(() => {})
  }

  // Deletar sessões e mensagens de chat
  const userChatSessions = await db.select({ id: chatSessions.id }).from(chatSessions).where(eq(chatSessions.userId, userId))
  const chatSessionIds = userChatSessions.map((s) => s.id)
  if (chatSessionIds.length > 0) {
    await db.delete(chatMessages).where(inArray(chatMessages.sessionId, chatSessionIds)).catch(() => {})
    await db.delete(chatSessions).where(inArray(chatSessions.id, chatSessionIds)).catch(() => {})
  }

  // Deletar perfil médico
  await db.delete(medicalProfiles).where(eq(medicalProfiles.userId, userId)).catch(() => {})

  // Deletar documentos do usuário
  await db.delete(documents).where(eq(documents.userId, userId)).catch(() => {})

  console.log(`Todos os dados do usuário ${userId} foram deletados (cascata manual), exceto o próprio usuário.`)
}

const userId = process.argv[2]
if (!userId) {
  console.error('Uso: pnpm tsx scripts/delete-user-data.ts <userId>')
  process.exit(1)
}

deleteUserData(userId).then(() => process.exit(0))
