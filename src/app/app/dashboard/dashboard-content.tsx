'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Upload, ClipboardList, ArrowRight, TrendingUp, TrendingDown, Minus, Loader2, LogOut, Activity } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CompactMarkerList } from './components/compact-marker-list'
import type { DashboardData, BodyCompositionSummary } from './page'
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
  const examDate = doc.examDate
    ? new Date(doc.examDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : doc.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="rounded-lg border border-foreground/8 bg-background/50 px-3 py-3 space-y-2 transition-colors hover:bg-background/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium text-foreground" title={doc.originalFileName}>
            {doc.originalFileName}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {doc.documentType} • {examDate}
          </p>
        </div>
        <Link
          href={`/app/documents/${doc.id}`}
          className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
        >
          Ver dados
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Evolução de parâmetros */}
      {evolution.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-foreground/6 pt-1.5">
          {evolution.map((ev, i) => (
            <EvolutionBadge key={`${ev.name}-${ev.unit}-${i}`} ev={ev} />
          ))}
        </div>
      )}
    </div>
  )
}

function BodyCompositionCard({ bc }: { bc: BodyCompositionSummary }) {
  const weight = bc.weight ? parseFloat(bc.weight).toFixed(1) : null
  const bodyFat = bc.bodyFat ? parseFloat(bc.bodyFat).toFixed(1) : null

  const measuredDate = new Date(bc.measuredAt + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const deltaColor = (delta: string | null) => {
    if (!delta) return 'text-muted-foreground'
    if (delta.startsWith('↑')) return 'text-red-500'
    if (delta.startsWith('↓')) return 'text-green-500'
    return 'text-muted-foreground'
  }

  return (
    <section aria-labelledby="bc-heading" data-testid="body-composition-card">
      <div className="rounded-xl border border-foreground/10 bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="bc-heading" className="font-semibold text-foreground">Composição Corporal</h2>
          </div>
          <span className="text-[11px] text-muted-foreground">{measuredDate}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {weight && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Peso</p>
              <p className="text-sm font-semibold text-foreground">{weight} kg</p>
              {bc.weightDelta && (
                <p className={`text-[11px] ${deltaColor(bc.weightDelta)}`}>
                  {bc.weightDelta} vs anterior
                </p>
              )}
            </div>
          )}
          {bodyFat && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Gordura Corporal</p>
              <p className="text-sm font-semibold text-foreground">{bodyFat}%</p>
              {bc.bodyFatDelta && (
                <p className={`text-[11px] ${deltaColor(bc.bodyFatDelta)}`}>
                  {bc.bodyFatDelta} vs anterior
                </p>
              )}
            </div>
          )}
        </div>

        <Link
          href="/app/profile"
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
        >
          Ver perfil completo
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

export function DashboardContent({ data }: DashboardContentProps) {
  const router = useRouter()
  const { userName, historyEntries, latestDocumentId, bodyComposition } = data
  const hasAnyDoc = historyEntries.length > 0
  const livingAnalysis = historyEntries[0]?.doc.livingAnalysis ?? null
  const hasAnalysis = livingAnalysis !== null
  const analysisIsCurrentForLatestDocument =
    livingAnalysis?.currentTriggerDocumentId != null &&
    latestDocumentId != null &&
    livingAnalysis.currentTriggerDocumentId === latestDocumentId
  const needsAnalysisUpdate = hasAnyDoc && latestDocumentId != null && !analysisIsCurrentForLatestDocument
  const [triggering, setTriggering] = useState(false)
  const autoTriggerAttemptedRef = useRef(false)

  async function handleTriggerAnalysis() {
    if (!latestDocumentId) return
    setTriggering(true)
    try {
      const resp = await fetch('/api/analyses/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: latestDocumentId }),
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.error ?? 'Erro ao iniciar análise.')
      }
      toast.success('Análise iniciada! Aguarde alguns instantes.')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setTriggering(false)
    }
  }

  useEffect(() => {
    if (!needsAnalysisUpdate || !latestDocumentId) return
    if (livingAnalysis?.status === 'processing') return
    if (autoTriggerAttemptedRef.current) return

    autoTriggerAttemptedRef.current = true
    void handleTriggerAnalysis()
  }, [latestDocumentId, livingAnalysis?.status, needsAnalysisUpdate])

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
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Olá, {displayName(userName)}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Aqui está um resumo da sua saúde e atividades recentes
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              aria-label="Sair"
              className="shrink-0 inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-foreground/15 bg-background/60 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="sr-only">Sair</span>
            </button>
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

      {/* Composição Corporal — só renderiza se há dados */}
      {bodyComposition && <BodyCompositionCard bc={bodyComposition} />}

      {/* Meus Exames */}
      <section aria-labelledby="exams-heading">
        <div className="rounded-xl border border-foreground/10 bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="exams-heading" className="font-semibold text-foreground">Meus Exames</h2>
            </div>
          </div>

          {!hasAnyDoc ? (
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
          ) : (
            <div className="space-y-3">
              {hasAnalysis && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Sua Análise Integrativa</p>
                      <p className="text-xs text-muted-foreground">
                        {livingAnalysis.status === 'processing'
                          ? 'Atualizando com o exame mais recente...'
                          : livingAnalysis.status === 'completed'
                            ? analysisIsCurrentForLatestDocument
                              ? 'Versão mais recente'
                              : 'Relatório anterior disponível enquanto a nova análise é gerada'
                            : 'Falhou — envie novo exame para retry'}
                      </p>
                    </div>
                    <Link
                      href={`/app/analyses/${livingAnalysis.id}`}
                      className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
                    >
                      {livingAnalysis.status === 'completed' ? 'Ver relatório' : 'Acompanhar'}
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
              {historyEntries[0]?.doc.snapshot?.structuredData && (
                <CompactMarkerList structuredData={historyEntries[0].doc.snapshot.structuredData} />
              )}
              <div className="space-y-2">
                {historyEntries.map(({ doc, evolution }) => (
                  <ExamRow key={doc.id} doc={doc} evolution={evolution} />
                ))}
              </div>
              {needsAnalysisUpdate && (
                <div className="rounded-lg border border-dashed border-foreground/15 bg-foreground/2 px-4 py-4 flex flex-col items-center gap-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {triggering || livingAnalysis?.status === 'processing'
                      ? 'Seu exame foi processado e a análise está sendo atualizada automaticamente.'
                      : 'Seu exame foi processado. A análise será atualizada automaticamente com este novo documento.'}
                  </p>
                  {(triggering || livingAnalysis?.status === 'processing') && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />Atualizando análise...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
