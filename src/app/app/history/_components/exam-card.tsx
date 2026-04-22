'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Droplets, FileText, Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { DocumentWithHistory, DocumentCategory } from '@/lib/db/queries/history'
import type { ParameterEvolution } from '@/lib/history/evolution'

type Props = {
  doc: DocumentWithHistory
  evolution: ParameterEvolution[]
}

const CATEGORY_CONFIG: Record<
  DocumentCategory,
  { label: string; Icon: React.ElementType; className: string }
> = {
  bioimpedance: {
    label: 'Bioimpedância',
    Icon: Scale,
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  blood_test: {
    label: 'Exames de Sangue',
    Icon: Droplets,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  other: {
    label: 'Outros',
    Icon: FileText,
    className: 'bg-muted text-muted-foreground',
  },
}

function CategoryBadge({ category }: { category: DocumentCategory | null }) {
  const { label, Icon, className } = category ? CATEGORY_CONFIG[category] : CATEGORY_CONFIG.other
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function EvolutionItem({ ev }: { ev: ParameterEvolution }) {
  const pct = Math.abs(ev.changePercent).toFixed(1)

  if (ev.direction === 'stable') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        {ev.name} estável
      </span>
    )
  }

  const isUp = ev.direction === 'up'
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${isUp ? 'text-red-500' : 'text-green-500'}`}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {ev.name} {isUp ? '↑' : '↓'} {pct}% vs exame anterior
    </span>
  )
}

export function ExamCard({ doc, evolution }: Props) {
  const examDateLabel = (() => {
    if (!doc.examDate) return null
    const [year, month, day] = doc.examDate.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  })()
  const uploadDateLabel = doc.createdAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{doc.documentType}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {examDateLabel ? `Exame: ${examDateLabel}` : `Enviado: ${uploadDateLabel}`}
          </p>
        </div>
        <CategoryBadge category={doc.category} />
      </div>

      {evolution.length > 0 && (
        <div className="flex flex-col gap-1">
          {evolution.map((ev, i) => (
            <EvolutionItem key={`${ev.name}-${ev.unit}-${i}`} ev={ev} />
          ))}
        </div>
      )}

      <Link
        href={`/app/documents/${doc.id}`}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'w-full justify-center text-xs',
        )}
      >
        Ver exame
      </Link>
    </div>
  )
}
