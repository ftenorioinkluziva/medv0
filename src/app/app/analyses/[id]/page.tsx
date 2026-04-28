import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { analyses, documents, healthAgents, livingAnalyses, livingAnalysisVersions } from '@/lib/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalysisStatusCard } from './analysis-status-card'
import { ReportView } from './report-view'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params
  return (
    <main className="min-h-screen bg-background">
      <div className="px-4 pb-24">
        <Suspense fallback={<ReportSkeleton />}>
          <AnalysisContent id={id} />
        </Suspense>
      </div>
    </main>
  )
}

async function AnalysisContent({ id }: { id: string }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  if (!isUuid(id)) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-muted-foreground">Relatório não encontrado.</p>
      </div>
    )
  }

  const [row] = await db
    .select({
      reportMarkdown: livingAnalyses.reportMarkdown,
      createdAt: livingAnalyses.createdAt,
      updatedAt: livingAnalyses.updatedAt,
      currentVersion: livingAnalyses.currentVersion,
      userId: livingAnalyses.userId,
      status: livingAnalyses.status,
    })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.id, id))
    .limit(1)

  if (!row) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-muted-foreground">Relatório não encontrado.</p>
      </div>
    )
  }

  if (row.userId !== session.user.id) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-muted-foreground">Acesso negado.</p>
      </div>
    )
  }

  if (row.status === 'processing') {
    // fetch current version to get agents progress and source doc
    const [versionRow] = await db
      .select({ id: livingAnalysisVersions.id, triggerDocumentId: livingAnalysisVersions.triggerDocumentId })
      .from(livingAnalysisVersions)
      .where(
        and(
          eq(livingAnalysisVersions.livingAnalysisId, id),
          eq(livingAnalysisVersions.version, row.currentVersion),
        ),
      )
      .limit(1)

    let processingAgents: Array<{ name: string; role: string; status: string }> = []
    let processingDocName: string | undefined

    if (versionRow) {
      const [trigDoc] = await db
        .select({ originalFileName: documents.originalFileName })
        .from(documents)
        .where(eq(documents.id, versionRow.triggerDocumentId))
        .limit(1)
      processingDocName = trigDoc?.originalFileName

      const agentRows = await db
        .select({
          agentName: analyses.agentName,
          analysisRole: analyses.analysisRole,
          status: analyses.status,
        })
        .from(analyses)
        .where(eq(analyses.livingAnalysisVersionId, versionRow.id))
        .orderBy(asc(analyses.createdAt))

      processingAgents = agentRows.map((r) => ({
        name: r.agentName,
        role: r.analysisRole,
        status: r.status,
      }))
    }

    return (
      <AnalysisStatusCard
        status="processing"
        createdAt={row.createdAt}
        updatedAt={row.updatedAt}
        livingAnalysisId={id}
        agents={processingAgents}
        sourceFileName={processingDocName}
      />
    )
  }

  if (row.status === 'failed' || !row.reportMarkdown) {
    return (
      <AnalysisStatusCard
        status="failed"
        createdAt={row.createdAt}
        updatedAt={row.updatedAt}
        livingAnalysisId={id}
      />
    )
  }

  const [currentVersionRow] = await db
    .select({
      id: livingAnalysisVersions.id,
      triggerDocumentId: livingAnalysisVersions.triggerDocumentId,
    })
    .from(livingAnalysisVersions)
    .where(
      and(
        eq(livingAnalysisVersions.livingAnalysisId, id),
        eq(livingAnalysisVersions.version, row.currentVersion),
      ),
    )
    .limit(1)

  let foundationAgentName: string | undefined
  let foundationGeneratedAt: Date | undefined
  let sourceFileName: string | undefined
  let specializedTotal = 0
  let specializedCompleted = 0
  let specializedTimeout = 0
  let specializedError = 0
  let structuredAnalyses: Array<{ agentName: string; specialty: string; data: unknown }> = []
  let specializedTextAnalyses: Array<{ agentName: string; specialty: string; content: string; createdAt: Date }> = []

  if (currentVersionRow) {
    const [triggerDocument] = await db
      .select({ originalFileName: documents.originalFileName })
      .from(documents)
      .where(eq(documents.id, currentVersionRow.triggerDocumentId))
      .limit(1)

    sourceFileName = triggerDocument?.originalFileName

    const [foundationRow] = await db
      .select({
        agentName: analyses.agentName,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .where(
        and(
          eq(analyses.livingAnalysisVersionId, currentVersionRow.id),
          eq(analyses.analysisRole, 'foundation'),
          eq(analyses.status, 'completed'),
        ),
      )
      .orderBy(asc(analyses.createdAt))
      .limit(1)

    foundationAgentName = foundationRow?.agentName
    foundationGeneratedAt = foundationRow?.createdAt

    const specializedRows = await db
      .select({ status: analyses.status })
      .from(analyses)
      .where(
        and(
          eq(analyses.livingAnalysisVersionId, currentVersionRow.id),
          eq(analyses.analysisRole, 'specialized'),
        ),
      )

    specializedTotal = specializedRows.length
    specializedCompleted = specializedRows.filter((row) => row.status === 'completed').length
    specializedTimeout = specializedRows.filter((row) => row.status === 'timeout').length
    specializedError = specializedRows.filter((row) => row.status === 'error').length

    const rawStructured = await db
      .select({
        agentName: analyses.agentName,
        specialty: healthAgents.specialty,
        content: analyses.content,
      })
      .from(analyses)
      .innerJoin(healthAgents, eq(analyses.agentId, healthAgents.id))
      .where(
        and(
          eq(analyses.livingAnalysisVersionId, currentVersionRow.id),
          eq(analyses.status, 'completed'),
          eq(healthAgents.outputType, 'structured'),
        ),
      )

    structuredAnalyses = rawStructured.flatMap((r) => {
      try {
        return [{ agentName: r.agentName, specialty: r.specialty, data: JSON.parse(r.content) }]
      } catch {
        return []
      }
    })

    const specializedTextRows = await db
      .select({
        agentName: analyses.agentName,
        specialty: healthAgents.specialty,
        content: analyses.content,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .innerJoin(healthAgents, eq(analyses.agentId, healthAgents.id))
      .where(
        and(
          eq(analyses.livingAnalysisVersionId, currentVersionRow.id),
          eq(analyses.analysisRole, 'specialized'),
          eq(analyses.status, 'completed'),
          eq(healthAgents.outputType, 'text'),
        ),
      )
      .orderBy(asc(analyses.createdAt))

    specializedTextAnalyses = specializedTextRows.map((r) => ({
      agentName: r.agentName,
      specialty: r.specialty,
      content: r.content,
      createdAt: r.createdAt,
    }))
  }

  return (
    <ReportView
      analysisId={id}
      reportMarkdown={row.reportMarkdown}
      version={row.currentVersion}
      createdAt={row.createdAt}
      sourceFileName={sourceFileName}
      foundationAgentName={foundationAgentName}
      foundationGeneratedAt={foundationGeneratedAt}
      specializedTotal={specializedTotal}
      specializedCompleted={specializedCompleted}
      specializedTimeout={specializedTimeout}
      specializedError={specializedError}
      structuredAnalyses={structuredAnalyses}
      specializedTextAnalyses={specializedTextAnalyses}
    />
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="rounded-lg border bg-card px-6 py-5 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-5 w-1/2 mt-4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-5 w-1/2 mt-4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}
