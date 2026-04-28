'use client'

import Link from 'next/link'
import { startTransition, useEffect, useState } from 'react'
import { formatDistanceToNow, formatRelative } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

type AnalysisStatus = 'processing' | 'failed'

interface AgentProgress {
  name: string
  role: string
  status: string
}

interface AnalysisStatusCardProps {
  status: AnalysisStatus
  createdAt: Date
  updatedAt: Date
  livingAnalysisId: string
  agents?: AgentProgress[]
  sourceFileName?: string
}

export function AnalysisStatusCard({
  status,
  createdAt,
  updatedAt,
  livingAnalysisId: _livingAnalysisId,
  agents = [],
  sourceFileName,
}: AnalysisStatusCardProps) {
  const router = useRouter()
  const [now, setNow] = useState(() => Date.now())
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (status !== 'processing') return

    const timerId = window.setInterval(() => {
      setNow(Date.now())

      if (document.visibilityState === 'hidden') return

      setIsRefreshing(true)
      startTransition(() => {
        router.refresh()
      })
    }, 5000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [router, status])

  useEffect(() => {
    if (!isRefreshing) return

    const resetId = window.setTimeout(() => {
      setIsRefreshing(false)
    }, 1200)

    return () => {
      window.clearTimeout(resetId)
    }
  }, [isRefreshing, now])

  const elapsedLabel = formatDistanceToNow(createdAt, {
    addSuffix: false,
    locale: ptBR,
  })
  const lastUpdateLabel = formatRelative(updatedAt, new Date(now), { locale: ptBR })
  if (status === 'failed') {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex h-13 items-center px-5">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
            <p className="font-heading text-sm font-semibold text-foreground">Análise falhou</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5">
          <p className="text-[13px] font-medium text-muted-foreground">
            O processamento falhou ou terminou sem um relatório válido. Última atualização: {lastUpdateLabel}.
          </p>
          <div className="flex gap-2">
            <Link href="/app/upload" className={cn(buttonVariants(), 'h-12 flex-1 rounded-xl justify-center')}>
              Enviar novo exame
            </Link>
            <Link href="/app/history" className={cn(buttonVariants({ variant: 'outline' }), 'h-12 flex-1 rounded-xl justify-center')}>
              Histórico
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // --- processing ---
  const completedCount = agents.filter((a) => a.status === 'completed').length
  const totalCount = agents.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="flex flex-col gap-3">
      {/* header */}
      <div className="flex h-14 items-center px-0">
        <p className="font-heading text-[16px] font-semibold leading-[1.4286] text-foreground">
          Analisando exame...
        </p>
      </div>

      {/* source doc card */}
      {sourceFileName && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex h-13 items-center px-5">
            <p className="font-heading text-sm font-semibold text-foreground truncate">
              📄 {sourceFileName}
            </p>
          </div>
          <div className="px-5 pb-4">
            <p className="text-[12px] font-medium text-muted-foreground">
              Processado · {elapsedLabel} atrás
            </p>
          </div>
        </div>
      )}

      {/* agents card */}
      {agents.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex h-13 items-center px-5">
            <p className="font-heading text-sm font-semibold text-foreground">🤖 Agentes em Execução</p>
          </div>
          <div className="flex flex-col gap-2 px-5 pb-4">
            {agents.map((agent) => {
              const isDone = agent.status === 'completed'
              const isRunning = agent.status === 'processing' || agent.status === 'pending'
              const isFailed = agent.status === 'error' || agent.status === 'timeout'

              const dotColor = isDone
                ? 'bg-[#22c55e]'
                : isRunning
                  ? 'bg-primary animate-pulse'
                  : isFailed
                    ? 'bg-destructive'
                    : 'bg-border'

              const statusLabel = isDone
                ? '✓ Concluído'
                : isRunning
                  ? '⏳ Processando...'
                  : isFailed
                    ? '✗ Erro'
                    : 'Aguardando...'

              const statusColor = isDone
                ? 'text-[#22c55e]'
                : isRunning
                  ? 'text-primary'
                  : isFailed
                    ? 'text-destructive'
                    : 'text-muted-foreground'

              const bgColor = isRunning
                ? 'bg-[#fff7ed] border border-[#fed7aa]'
                : 'bg-muted'

              const nameColor = isDone || isRunning ? 'text-foreground' : 'text-muted-foreground'

              return (
                <div
                  key={agent.name}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${bgColor}`}
                >
                  <div className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <p className={`font-heading text-[13px] font-semibold leading-[1.4286] ${nameColor}`}>
                      {agent.name}
                    </p>
                    <p className={`text-[11px] font-medium ${statusColor}`}>{statusLabel}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* progress card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex h-13 items-center justify-between px-5">
          <p className="font-heading text-sm font-semibold text-foreground">Progresso</p>
          <p className="text-[12px] font-medium text-muted-foreground">
            {completedCount} / {totalCount > 0 ? totalCount : '…'} agentes
          </p>
        </div>
        <div className="px-5 pb-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
