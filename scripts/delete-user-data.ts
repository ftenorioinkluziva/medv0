// scripts/delete-user-data.ts
import 'dotenv/config'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import {
  medicalProfiles,
  documents,
  snapshots,
  livingAnalyses,
  livingAnalysisVersions,
  bodyCompositionHistory,
  chatSessions,
  chatMessages,
  analyses,
  completeAnalyses,
} from '@/lib/db/schema'

async function deleteUserData(userId: string) {
  await db.transaction(async (tx) => {
    // Tables with no direct userId: delete via FK chains first

    // livingAnalysisVersions: referenced by both triggerDocumentId and livingAnalysisId
    const userDocs = await tx.select({ id: documents.id }).from(documents).where(eq(documents.userId, userId))
    const documentIds = userDocs.map((d) => d.id)
    if (documentIds.length > 0) {
      await tx.delete(livingAnalysisVersions).where(inArray(livingAnalysisVersions.triggerDocumentId, documentIds))
    }

    const userLivingAnalyses = await tx.select({ id: livingAnalyses.id }).from(livingAnalyses).where(eq(livingAnalyses.userId, userId))
    const livingAnalysisIds = userLivingAnalyses.map((a) => a.id)
    if (livingAnalysisIds.length > 0) {
      await tx.delete(livingAnalysisVersions).where(inArray(livingAnalysisVersions.livingAnalysisId, livingAnalysisIds))
      await tx.delete(livingAnalyses).where(inArray(livingAnalyses.id, livingAnalysisIds))
    }

    // chatMessages: referenced by sessionId (no userId column)
    const userChatSessions = await tx.select({ id: chatSessions.id }).from(chatSessions).where(eq(chatSessions.userId, userId))
    const chatSessionIds = userChatSessions.map((s) => s.id)
    if (chatSessionIds.length > 0) {
      await tx.delete(chatMessages).where(inArray(chatMessages.sessionId, chatSessionIds))
    }

    // Tables with userId column: delete directly — catches all rows including orphans
    await tx.delete(analyses).where(eq(analyses.userId, userId))
    await tx.delete(completeAnalyses).where(eq(completeAnalyses.userId, userId))
    await tx.delete(bodyCompositionHistory).where(eq(bodyCompositionHistory.userId, userId))
    await tx.delete(snapshots).where(eq(snapshots.userId, userId))
    await tx.delete(chatSessions).where(eq(chatSessions.userId, userId))
    await tx.delete(medicalProfiles).where(eq(medicalProfiles.userId, userId))
    await tx.delete(documents).where(eq(documents.userId, userId))
  })

  console.log(`Todos os dados do usuário ${userId} foram deletados (cascata manual), exceto o próprio usuário.`)
}

const userId = process.argv[2]
const confirmed = process.argv.includes('--yes')

if (!userId) {
  console.error('Uso: pnpm tsx scripts/delete-user-data.ts <userId> --yes')
  process.exit(1)
}

if (!confirmed) {
  console.error(`AVISO: Esta operação é irreversível. Execute com --yes para confirmar.\nUsuário alvo: ${userId}`)
  process.exit(1)
}

deleteUserData(userId)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Falha ao deletar dados do usuário:', err)
    process.exit(1)
  })
