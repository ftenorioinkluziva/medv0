import { Suspense, lazy } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardData } from '@/lib/db/queries/dashboard'
import { getDocumentsWithHistory } from '@/lib/db/queries/history'
import { getLatestBodyComposition } from '@/lib/db/queries/body-composition'
import { getLatestProductsSummary } from '@/lib/db/queries/generated-products'
import { computeEvolution } from '@/lib/history/evolution'
import type { DocumentWithHistory } from '@/lib/db/queries/history'
import type { ParameterEvolution } from '@/lib/history/evolution'
import type { DashboardProfile, DashboardDocument, DashboardAnalysis } from '@/lib/db/queries/dashboard'

const DashboardContent = lazy(() => import('./dashboard-content').then(mod => ({ default: mod.DashboardContent })))

export type HistoryEntry = {
  doc: DocumentWithHistory
  evolution: ParameterEvolution[]
}

export type BodyCompositionSummary = {
  weight: string | null
  bodyFat: string | null
  muscleMass: string | null
  measuredAt: string
  weightDelta: string | null
  bodyFatDelta: string | null
  muscleMassDelta: string | null
}

export type ProductSummaryItem = {
  productType: string
  createdAt: Date
  status: string
}

export type DashboardData = {
  userName: string
  // E12 — new sections
  profile: DashboardProfile | null
  recentDocs: DashboardDocument[]
  livingAnalysis: DashboardAnalysis | null
  // legacy — kept for existing components
  historyEntries: HistoryEntry[]
  latestDocumentId: string | null
  bodyComposition: BodyCompositionSummary | null
  productsSummary: ProductSummaryItem[]
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
  const [e12Data, allDocs, bodyCompResult, productsSummary] = await Promise.all([
    getDashboardData(userId),
    getDocumentsWithHistory(userId),
    getLatestBodyComposition(userId),
    getLatestProductsSummary(userId),
  ])

  const labReportDocs = allDocs.filter((doc) => doc.documentType === 'lab_report')

  const historyEntries: HistoryEntry[] = allDocs.slice(0, 5).map((doc, i) => {
    const samePrevious = allDocs.slice(i + 1).find((d) => d.documentType === doc.documentType)
    return { doc, evolution: computeEvolution(doc, samePrevious) }
  })

  const latestDocumentId = labReportDocs[0]?.id ?? null

  const bodyComposition: BodyCompositionSummary | null = bodyCompResult.latest
    ? {
        weight: bodyCompResult.latest.weight,
        bodyFat: bodyCompResult.latest.bodyFat,
        muscleMass: bodyCompResult.latest.muscleMass,
        measuredAt: bodyCompResult.latest.measuredAt,
        weightDelta: bodyCompResult.delta?.weight ?? null,
        bodyFatDelta: bodyCompResult.delta?.bodyFat ?? null,
        muscleMassDelta: bodyCompResult.delta?.muscleMass ?? null,
      }
    : null

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent
        data={{
          userName,
          profile: e12Data.profile,
          recentDocs: e12Data.recentDocs,
          livingAnalysis: e12Data.livingAnalysis,
          historyEntries,
          latestDocumentId,
          bodyComposition,
          productsSummary,
        }}
      />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Profile card skeleton */}
      <div className="rounded-lg border p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>

      {/* Recent docs skeleton */}
      <div className="rounded-lg border p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}
