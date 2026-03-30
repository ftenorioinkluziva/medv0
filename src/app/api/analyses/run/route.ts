import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { completeAnalyses } from '@/lib/db/schema'
import { runCompleteAnalysis } from '@/lib/ai/orchestrator/complete-analysis'

export const maxDuration = 60

const RunAnalysisSchema = z.object({
  documentId: z.string().uuid(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const parsed = RunAnalysisSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validação falhou.', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { documentId } = parsed.data
  const userId = session.user.id
  const completeAnalysisId = crypto.randomUUID()

  await db.insert(completeAnalyses).values({
    id: completeAnalysisId,
    userId,
    documentId,
    reportMarkdown: '',
    agentsCount: 0,
    foundationCompleted: 0,
    specializedCompleted: 0,
    status: 'processing',
  })

  after(async () => {
    try {
      await runCompleteAnalysis(userId, documentId, completeAnalysisId)
    } catch (error) {
      console.error('[analyses/run] Background analysis failed:', error)
    }
  })

  return NextResponse.json({ completeAnalysisId })
}
