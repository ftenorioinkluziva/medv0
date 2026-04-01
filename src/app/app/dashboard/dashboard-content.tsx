'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AlteredMarkerCard } from './components/altered-marker-card'
import { AnalysisCard } from './components/analysis-card'
import { EmptyStateCard } from './components/empty-state-card'
import type { DashboardData } from './page'

interface DashboardContentProps {
  data: DashboardData
}

export function DashboardContent({ data }: DashboardContentProps) {
  const { lastDocument, alteredMarkers, lastAnalysis } = data

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <Link
          href="/app/upload"
          className={cn(buttonVariants({ size: 'sm' }), 'min-h-[44px] gap-1.5')}
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo exame
        </Link>
      </div>

      {!lastDocument ? (
        <EmptyStateCard variant="no-exam" />
      ) : !lastAnalysis ? (
        <EmptyStateCard variant="no-analysis" documentId={lastDocument.id} />
      ) : lastAnalysis.status === 'processing' ? (
        <>
          <AnalysisCard
            analysisId={lastAnalysis.id}
            examDate={lastDocument.examDate}
            documentType={lastDocument.documentType}
            analysisCreatedAt={lastAnalysis.createdAt}
            analysisStatus={lastAnalysis.status}
          />
          <EmptyStateCard variant="processing" />
        </>
      ) : (
        <>
          <AnalysisCard
            analysisId={lastAnalysis.id}
            examDate={lastDocument.examDate}
            documentType={lastDocument.documentType}
            analysisCreatedAt={lastAnalysis.createdAt}
            analysisStatus={lastAnalysis.status}
          />
          {alteredMarkers.length > 0 && (
            <section aria-labelledby="markers-heading">
              <h2
                id="markers-heading"
                className="mb-2 text-sm font-medium text-muted-foreground"
              >
                Biomarcadores alterados
              </h2>
              <div className="space-y-2">
                {alteredMarkers.map((marker, i) => (
                  <AlteredMarkerCard
                    key={`${marker.name}-${i}`}
                    name={marker.name}
                    value={marker.value}
                    unit={marker.unit}
                    status={marker.status ?? 'borderline'}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
