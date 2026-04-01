import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { documents, snapshots, completeAnalyses } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardContent } from './dashboard-content'
import { extractAlteredMarkers } from '@/lib/dashboard/markers'
import type { AlteredMarker } from '@/lib/dashboard/markers'

export type DashboardData = {
  lastDocument: {
    id: string
    examDate: string | null
    documentType: string
  } | null
  alteredMarkers: AlteredMarker[]
  lastAnalysis: {
    id: string
    status: string
    createdAt: Date
  } | null
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')
  if (!session.user.onboardingCompleted) redirect('/app/onboarding')

  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData userId={session.user.id} />
      </Suspense>
    </main>
  )
}

async function DashboardData({ userId }: { userId: string }) {
  const [lastDoc] = await db
    .select({
      id: documents.id,
      examDate: documents.examDate,
      documentType: documents.documentType,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(sql`${documents.examDate} DESC NULLS LAST`, desc(documents.createdAt))
    .limit(1)

  if (!lastDoc) {
    return (
      <DashboardContent
        data={{ lastDocument: null, alteredMarkers: [], lastAnalysis: null }}
      />
    )
  }

  const [snapshotRow, analysisRow] = await Promise.all([
    db
      .select({ structuredData: snapshots.structuredData })
      .from(snapshots)
      .where(eq(snapshots.documentId, lastDoc.id))
      .limit(1),
    db
      .select({ id: completeAnalyses.id, status: completeAnalyses.status, createdAt: completeAnalyses.createdAt })
      .from(completeAnalyses)
      .where(eq(completeAnalyses.documentId, lastDoc.id))
      .limit(1),
  ])

  const alteredMarkers = extractAlteredMarkers(snapshotRow[0]?.structuredData ?? null)
  const lastAnalysis = analysisRow[0] ?? null

  return (
    <DashboardContent
      data={{
        lastDocument: lastDoc,
        alteredMarkers,
        lastAnalysis,
      }}
    />
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-label="Carregando dashboard...">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <Skeleton className="h-4 w-36" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl ring-1 ring-foreground/10 p-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
