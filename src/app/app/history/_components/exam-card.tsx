'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { DocumentWithHistory } from '@/lib/db/queries/history'
import type { ParameterEvolution } from '@/lib/history/evolution'

type Props = {
  doc: DocumentWithHistory
  evolution: ParameterEvolution[]
}

const STATUS_LABELS: Record<string, string> = {
  processing: 'Processando',
  completed: 'Concluído',
  failed: 'Falhou',
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
  const analysisStatus = doc.completeAnalysis?.status ?? null
  const actionHref =
    analysisStatus === 'completed' || analysisStatus === 'processing'
      ? `/app/analyses/${doc.completeAnalysis?.id}`
      : `/app/analyses/run?documentId=${encodeURIComponent(doc.id)}`
  const actionLabel =
    analysisStatus === 'completed'
      ? 'Ver relatório'
      : analysisStatus === 'processing'
        ? 'Acompanhar análise'
        : analysisStatus === 'failed'
          ? 'Tentar novamente'
          : 'Analisar'

  return (
    <div className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{doc.documentType}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {examDateLabel ? `Exame: ${examDateLabel}` : `Enviado: ${uploadDateLabel}`}
          </p>
        </div>
        <Badge variant={doc.completeAnalysis?.status === 'completed' ? 'default' : 'secondary'} className="shrink-0 text-xs">
          {doc.completeAnalysis ? STATUS_LABELS[doc.completeAnalysis.status] ?? doc.completeAnalysis.status : 'Sem análise'}
        </Badge>
      </div>

      {evolution.length > 0 && (
        <div className="flex flex-col gap-1">
          {evolution.map((ev) => (
            <EvolutionItem key={`${ev.name}-${ev.unit}`} ev={ev} />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Link
          href={`/app/documents/${doc.id}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'flex-1 justify-center text-xs')}
        >
          Ver exame
        </Link>
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: analysisStatus === 'completed' ? 'outline' : 'default', size: 'sm' }), 'flex-1 justify-center text-xs')}
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  )
}
