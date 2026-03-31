import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { completeAnalyses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Skeleton } from '@/components/ui/skeleton'
import { ReportView } from './report-view'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
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

  const [row] = await db
    .select({
      reportMarkdown: completeAnalyses.reportMarkdown,
      createdAt: completeAnalyses.createdAt,
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
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-muted-foreground">Análise em andamento. Aguarde alguns instantes.</p>
      </div>
    )
  }

  if (row.status === 'failed' || !row.reportMarkdown) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-muted-foreground">Não foi possível gerar o relatório.</p>
      </div>
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
