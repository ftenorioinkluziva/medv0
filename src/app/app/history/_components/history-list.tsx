'use client'

import { useState } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ExamCard } from './exam-card'
import type { DocumentWithHistory, DocumentCategory } from '@/lib/db/queries/history'
import type { ParameterEvolution } from '@/lib/history/evolution'

type FilterValue = 'all' | DocumentCategory

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'bioimpedance', label: 'Bioimpedância' },
  { value: 'blood_test', label: 'Exames de Sangue' },
  { value: 'other', label: 'Outros' },
]

type Props = {
  documents: DocumentWithHistory[]
  evolutionMap: Record<string, ParameterEvolution[]>
}

export function HistoryList({ documents, evolutionMap }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all')

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground text-sm">Nenhum exame encontrado</p>
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
        aria-label="Filtrar por categoria"
        className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar"
      >
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            role="tab"
            aria-selected={activeFilter === value}
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
    </div>
  )
}
