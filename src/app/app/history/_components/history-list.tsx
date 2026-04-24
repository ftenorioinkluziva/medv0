'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, Brain, CheckCircle2, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { ExamCard } from './exam-card'
import type {
  AnalysisHistoryItem,
  DocumentCategory,
  DocumentWithHistory,
} from '@/lib/db/queries/history'
import type { ParameterEvolution } from '@/lib/history/evolution'

type FilterValue = 'all' | DocumentCategory
type ViewValue = 'exams' | 'analyses'

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'bioimpedance', label: 'Bioimpedância' },
  { value: 'blood_test', label: 'Exames de Sangue' },
  { value: 'other', label: 'Outros' },
]

type Props = {
  documents: DocumentWithHistory[]
  analyses: AnalysisHistoryItem[]
  evolutionMap: Record<string, ParameterEvolution[]>
}

const FILTER_VALUES: FilterValue[] = ['all', 'bioimpedance', 'blood_test', 'other']
const FILTER_SESSION_KEY = 'history.activeFilter'
const VIEW_SESSION_KEY = 'history.activeView'

export function HistoryList({ documents, analyses, evolutionMap }: Props) {
  const [activeView, setActiveView] = useState<ViewValue>(() => {
    try {
      return sessionStorage.getItem(VIEW_SESSION_KEY) === 'analyses' ? 'analyses' : 'exams'
    } catch {
      return 'exams'
    }
  })
  const [activeFilter, setActiveFilter] = useState<FilterValue>(() => {
    try {
      const stored = sessionStorage.getItem(FILTER_SESSION_KEY)
      return stored && FILTER_VALUES.includes(stored as FilterValue)
        ? (stored as FilterValue)
        : 'all'
    } catch {
      return 'all'
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(VIEW_SESSION_KEY, activeView)
    } catch {
      // sessionStorage unavailable - silently ignore
    }
  }, [activeView])

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_SESSION_KEY, activeFilter)
    } catch {
      // sessionStorage unavailable - silently ignore
    }
  }, [activeFilter])

  if (documents.length === 0 && analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground text-sm">Nenhum exame ou análise encontrado</p>
        <Link href="/app/upload" className={cn(buttonVariants(), 'min-h-11')}>
          Enviar primeiro exame
        </Link>
      </div>
    )
  }

  const counts: Record<FilterValue, number> = {
    all: documents.length,
    bioimpedance: documents.filter((d) => d.category === 'bioimpedance').length,
    blood_test: documents.filter((d) => d.category === 'blood_test').length,
    other: documents.filter((d) => d.category === 'other' || d.category === null).length,
  }

  const filtered =
    activeFilter === 'all'
      ? documents
      : activeFilter === 'other'
        ? documents.filter((d) => d.category === 'other' || d.category === null)
        : documents.filter((d) => d.category === activeFilter)

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Tipo de histórico"
        className="grid grid-cols-2 rounded-xl bg-muted p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'exams'}
          onClick={() => setActiveView('exams')}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-semibold transition-all',
            activeView === 'exams'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Exames
          <span className="ml-1.5 text-xs font-medium text-muted-foreground">{documents.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'analyses'}
          onClick={() => setActiveView('analyses')}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-semibold transition-all',
            activeView === 'analyses'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Análises
          <span className="ml-1.5 text-xs font-medium text-muted-foreground">{analyses.length}</span>
        </button>
      </div>

      {activeView === 'exams' ? (
        <ExamHistory
          activeFilter={activeFilter}
          counts={counts}
          filtered={filtered}
          setActiveFilter={setActiveFilter}
          evolutionMap={evolutionMap}
        />
      ) : (
        <AnalysisHistory analyses={analyses} />
      )}
    </div>
  )
}

function ExamHistory({
  activeFilter,
  counts,
  filtered,
  setActiveFilter,
  evolutionMap,
}: {
  activeFilter: FilterValue
  counts: Record<FilterValue, number>
  filtered: DocumentWithHistory[]
  setActiveFilter: (value: FilterValue) => void
  evolutionMap: Record<string, ParameterEvolution[]>
}) {
  return (
    <>
      <div
        role="group"
        aria-label="Filtrar por categoria"
        className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar"
      >
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={activeFilter === value}
            onClick={() => setActiveFilter(value)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              activeFilter === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {label}
            <span
              className={cn(
                'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                activeFilter === value
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-background text-muted-foreground',
              )}
            >
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum exame nesta categoria
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((doc) => (
            <ExamCard key={doc.id} doc={doc} evolution={evolutionMap[doc.id] ?? []} />
          ))}
        </div>
      )}
    </>
  )
}

function AnalysisHistory({ analyses }: { analyses: AnalysisHistoryItem[] }) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm font-medium text-foreground">Nenhuma análise gerada ainda</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie um exame para iniciar a primeira análise de saúde.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {analyses.map((analysis) => (
        <AnalysisHistoryCard key={analysis.id} analysis={analysis} />
      ))}
    </div>
  )
}

function AnalysisHistoryCard({ analysis }: { analysis: AnalysisHistoryItem }) {
  const createdAtLabel = analysis.createdAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const examDateLabel = analysis.triggerDocumentExamDate
    ? new Date(`${analysis.triggerDocumentExamDate}T00:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null

  const statusConfig =
    analysis.status === 'processing'
      ? {
          label: 'Em andamento',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
          Icon: Loader2,
          iconClassName: 'animate-spin',
        }
      : analysis.status === 'failed'
        ? {
            label: 'Falhou',
            className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            Icon: AlertCircle,
            iconClassName: '',
          }
        : {
            label: 'Concluída',
            className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            Icon: CheckCircle2,
            iconClassName: '',
          }
  const StatusIcon = statusConfig.Icon

  return (
    <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold">Análise v{analysis.version}</p>
            {analysis.isCurrent && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                atual
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Gerada em {createdAtLabel}</p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
            statusConfig.className,
          )}
        >
          <StatusIcon className={cn('h-3 w-3', statusConfig.iconClassName)} />
          {statusConfig.label}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Exame base</dt>
          <dd className="truncate font-medium text-foreground">{analysis.triggerDocumentType}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Data do exame</dt>
          <dd className="font-medium text-foreground">{examDateLabel ?? 'Não informada'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Agentes</dt>
          <dd className="font-medium text-foreground">{analysis.agentsCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Especialistas</dt>
          <dd className="font-medium text-foreground">{analysis.specializedCompleted}</dd>
        </div>
      </dl>

      {analysis.isCurrent && analysis.status === 'completed' ? (
        <Link
          href={`/app/analyses/${analysis.livingAnalysisId}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full justify-center text-xs')}
        >
          Ver relatório
        </Link>
      ) : (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
          Versão registrada no histórico
        </p>
      )}
    </div>
  )
}
