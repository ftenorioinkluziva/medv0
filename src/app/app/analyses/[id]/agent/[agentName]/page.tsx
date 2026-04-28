import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { analyses, healthAgents, livingAnalyses, livingAnalysisVersions } from '@/lib/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { Skeleton } from '@/components/ui/skeleton'
import { AgentReportView } from './agent-report-view'

interface AgentDetailPageProps {
  params: Promise<{ id: string; agentName: string }>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id, agentName } = await params
  return (
    <main className="min-h-screen bg-background">
      <div className="px-4 pb-24">
        <Suspense fallback={<AgentSkeleton />}>
          <AgentDetailContent id={id} agentName={decodeURIComponent(agentName)} />
        </Suspense>
      </div>
    </main>
  )
}

async function AgentDetailContent({ id, agentName }: { id: string; agentName: string }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  if (!isUuid(id)) {
    return <NotFound />
  }

  const [livingRow] = await db
    .select({ userId: livingAnalyses.userId, currentVersion: livingAnalyses.currentVersion })
    .from(livingAnalyses)
    .where(eq(livingAnalyses.id, id))
    .limit(1)

  if (!livingRow || livingRow.userId !== session.user.id) {
    return <NotFound />
  }

  const [versionRow] = await db
    .select({ id: livingAnalysisVersions.id })
    .from(livingAnalysisVersions)
    .where(
      and(
        eq(livingAnalysisVersions.livingAnalysisId, id),
        eq(livingAnalysisVersions.version, livingRow.currentVersion),
      ),
    )
    .limit(1)

  if (!versionRow) {
    return <NotFound />
  }

  const [agentRow] = await db
    .select({
      agentName: analyses.agentName,
      content: analyses.content,
      analysisRole: analyses.analysisRole,
      status: analyses.status,
      createdAt: analyses.createdAt,
      specialty: healthAgents.specialty,
      outputType: healthAgents.outputType,
    })
    .from(analyses)
    .innerJoin(healthAgents, eq(analyses.agentId, healthAgents.id))
    .where(
      and(
        eq(analyses.livingAnalysisVersionId, versionRow.id),
        eq(analyses.agentName, agentName),
        eq(analyses.status, 'completed'),
      ),
    )
    .orderBy(asc(analyses.createdAt))
    .limit(1)

  if (!agentRow) {
    return <NotFound />
  }

  return (
    <AgentReportView
      analysisId={id}
      agentName={agentRow.agentName}
      specialty={agentRow.specialty}
      content={agentRow.content}
      outputType={agentRow.outputType}
      analysisRole={agentRow.analysisRole}
      createdAt={agentRow.createdAt}
    />
  )
}

function NotFound() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center mt-4">
      <p className="text-muted-foreground text-sm">Análise não encontrada.</p>
    </div>
  )
}

function AgentSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between h-14">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="rounded-2xl border bg-card px-5 py-4 space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}
