import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardContent } from './dashboard-content'
import { getDocumentsWithHistory } from '@/lib/db/queries/history'
import { computeEvolution } from '@/lib/history/evolution'
import type { DocumentWithHistory } from '@/lib/db/queries/history'
import type { ParameterEvolution } from '@/lib/history/evolution'

export type HistoryEntry = {
  doc: DocumentWithHistory
  evolution: ParameterEvolution[]
}

export type DashboardData = {
  userName: string
  historyEntries: HistoryEntry[]
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')
  if (!session.user.onboardingCompleted) redirect('/app/onboarding')

  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader
          userId={session.user.id}
          userName={session.user.name ?? session.user.email ?? ''}
        />
      </Suspense>
    </main>
  )
}

async function DashboardDataLoader({ userId, userName }: { userId: string; userName: string }) {
  const allDocs = await getDocumentsWithHistory(userId)

  const historyEntries: HistoryEntry[] = allDocs.slice(0, 5).map((doc, i) => {
    const samePrevious = allDocs.slice(i + 1).find((d) => d.documentType === doc.documentType)
    return { doc, evolution: computeEvolution(doc, samePrevious) }
  })

  return <DashboardContent data={{ userName, historyEntries }} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 p-4 md:p-6" aria-label="Carregando dashboard..." role="status">
      <div className="rounded-2xl border border-foreground/10 bg-card p-5 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
