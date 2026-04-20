'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { DocumentWithHistory } from '@/lib/db/queries/history'
import type { ParameterEvolution } from '@/lib/history/evolution'

type Props = {
  doc: DocumentWithHistory
  evolution: ParameterEvolution[]
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
  const examDateLabel = doc.examDate
    ? new Date(doc.examDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
  const uploadDateLabel = doc.createdAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{doc.documentType}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {examDateLabel ? `Exame: ${examDateLabel}` : `Enviado: ${uploadDateLabel}`}
          </p>
        </div>
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
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full justify-center text-xs')}
      >
        Ver exame
      </Link>
    </div>
  )
}
