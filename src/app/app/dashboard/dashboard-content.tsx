'use client'

import Link from 'next/link'
import { Upload, ClipboardList, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DashboardData } from './page'
import type { DocumentWithHistory } from '@/lib/db/queries/history'
import type { ParameterEvolution } from '@/lib/history/evolution'

interface DashboardContentProps {
  data: DashboardData
}

const displayName = (name: string | null | undefined): string => {
  const raw = name?.trim()
  if (!raw) return 'você'
  const token = raw.includes('@') ? raw.split('@')[0] : raw.split(' ')[0]
  return token.length > 18 ? `${token.slice(0, 17)}…` : token
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'warning' }> = {
  completed: { label: 'Concluído', variant: 'default' },
  processing: { label: 'Processando', variant: 'warning' },
  failed: { label: 'Falhou', variant: 'destructive' },
}

function EvolutionBadge({ ev }: { ev: ParameterEvolution }) {
  if (ev.direction === 'stable') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Minus className="size-2.5" />
        {ev.name} estável
      </span>
    )
  }
  const isUp = ev.direction === 'up'
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium', isUp ? 'text-red-500' : 'text-green-500')}>
      {isUp ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
      {ev.name} {isUp ? '↑' : '↓'} {Math.abs(ev.changePercent).toFixed(1)}%
    </span>
  )
}

function ExamRow({ doc, evolution }: { doc: DocumentWithHistory; evolution: ParameterEvolution[] }) {
  const status = doc.completeAnalysis?.status ?? null
  const statusConfig = status ? STATUS_CONFIG[status] : null

  const examDate = doc.examDate
    ? new Date(doc.examDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : doc.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  const action =
    status === 'completed'
      ? { label: 'Ver relatório', href: `/app/analyses/${doc.completeAnalysis!.id}` }
      : status === 'processing'
        ? { label: 'Acompanhar', href: `/app/analyses/${doc.completeAnalysis!.id}` }
        : { label: 'Analisar', href: `/app/analyses/run?documentId=${encodeURIComponent(doc.id)}` }

  return (
    <div className="rounded-lg border border-foreground/8 bg-background/50 px-3 py-3 space-y-2 transition-colors hover:bg-background/70">
      {/* Linha principal */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium text-foreground" title={doc.originalFileName}>
            {doc.originalFileName}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {doc.documentType} • {examDate}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {statusConfig ? (
            <Badge variant={statusConfig.variant} className="text-[10px] px-1.5 py-0">
              {statusConfig.label}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Sem análise
            </Badge>
          )}
          <Link
            href={action.href}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline focus-visible:outline-none"
          >
            {action.label}
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Evolução de parâmetros */}
      {evolution.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-foreground/6 pt-1.5">
          {evolution.map((ev) => (
            <EvolutionBadge key={`${ev.name}-${ev.unit}`} ev={ev} />
          ))}
        </div>
      )}
    </div>
  )
}

export function DashboardContent({ data }: DashboardContentProps) {
  const { userName, historyEntries } = data
  const hasAnyDoc = historyEntries.length > 0
  const hasNoAnalysis = hasAnyDoc && historyEntries.every(({ doc }) => !doc.completeAnalysis)

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <section
        aria-label="Boas-vindas"
        className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-primary/8 to-transparent"
          aria-hidden="true"
        />
        <div className="relative space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Olá, {displayName(userName)}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Aqui está um resumo da sua saúde e atividades recentes
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/upload"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Upload className="size-4" aria-hidden="true" />
              Novo upload
            </Link>
            <Link
              href="/app/profile"
              className="inline-flex min-h-9 items-center rounded-lg border border-foreground/15 bg-background/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Atualizar perfil
            </Link>
          </div>
        </div>
      </section>

      {/* Meus Exames */}
      <section aria-labelledby="exams-heading">
        <div className="rounded-xl border border-foreground/10 bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="exams-heading" className="font-semibold text-foreground">Meus Exames</h2>
            </div>
            {hasAnyDoc && (
              <Link
                href="/app/history"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none"
              >
                Ver histórico completo
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            )}
          </div>

          {!hasAnyDoc ? (
            /* Estado vazio: sem nenhum documento */
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Você ainda não enviou nenhum exame.
              </p>
              <Link
                href="/app/upload"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Upload className="size-4" aria-hidden="true" />
                Enviar primeiro exame
              </Link>
            </div>
          ) : hasNoAnalysis ? (
            /* Tem documentos mas nenhuma análise */
            <>
              <div className="space-y-2">
                {historyEntries.map(({ doc, evolution }) => (
                  <ExamRow key={doc.id} doc={doc} evolution={evolution} />
                ))}
              </div>
              <div className="rounded-lg border border-dashed border-foreground/15 bg-foreground/2 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Seus documentos ainda não foram analisados.{' '}
                  <Link
                    href={`/app/analyses/run?documentId=${encodeURIComponent(historyEntries[0].doc.id)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Iniciar análise
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* Estado normal: docs com análises */
            <div className="space-y-2">
              {historyEntries.map(({ doc, evolution }) => (
                <ExamRow key={doc.id} doc={doc} evolution={evolution} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
