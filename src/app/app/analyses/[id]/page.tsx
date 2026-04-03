import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { completeAnalyses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl">
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
      documentId: completeAnalyses.documentId,
      reportMarkdown: completeAnalyses.reportMarkdown,
      createdAt: completeAnalyses.createdAt,
      updatedAt: completeAnalyses.updatedAt,
      agentsCount: completeAnalyses.agentsCount,
      userId: completeAnalyses.userId,
      status: completeAnalyses.status,
    })
    .from(completeAnalyses)
    .where(eq(completeAnalyses.id, id))
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
    return (
      <AnalysisStatusCard
        status="processing"
        createdAt={row.createdAt}
        updatedAt={row.updatedAt}
        documentId={row.documentId}
      />
    )
  }

  if (row.status === 'failed' || !row.reportMarkdown) {
    return (
      <AnalysisStatusCard
        status="failed"
        createdAt={row.createdAt}
        updatedAt={row.updatedAt}
        documentId={row.documentId}
      />
    )
  }

  return (
    <ReportView
      reportMarkdown={row.reportMarkdown}
      agentsCount={row.agentsCount}
      createdAt={row.createdAt}
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
