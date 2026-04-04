'use client'

import Link from 'next/link'
import { startTransition, useEffect, useState } from 'react'
import { formatDistanceToNow, formatRelative } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, Clock3, Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AnalysisStatus = 'processing' | 'failed'

interface AnalysisStatusCardProps {
  status: AnalysisStatus
  createdAt: Date
  updatedAt: Date
  livingAnalysisId: string
}

export function AnalysisStatusCard({
  status,
  createdAt,
  updatedAt,
  livingAnalysisId: _livingAnalysisId,
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
  const isLongRunning = now - createdAt.getTime() > 120000

  if (status === 'failed') {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Nao foi possivel concluir a analise</p>
              <p className="text-sm text-muted-foreground">
                O processamento falhou ou terminou sem um relatorio valido.
              </p>
              <p className="text-xs text-muted-foreground">Ultima atualizacao: {lastUpdateLabel}.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/app/upload"
                className={cn(buttonVariants(), 'min-h-11 justify-center')}
              >
                Enviar novo exame
              </Link>
              <Link
                href="/app/history"
                className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 justify-center')}
              >
                Voltar ao historico
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" aria-hidden="true" />
          <p className="font-medium text-foreground">Analise em andamento</p>
          <p className="text-sm text-muted-foreground">
            Atualizando automaticamente a cada 5 segundos.
          </p>
        </div>

        <div className="grid gap-3 rounded-lg border border-border/60 bg-background/40 p-4 text-left sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tempo decorrido</p>
              <p className="text-sm font-medium text-foreground">{elapsedLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <RefreshCw
              className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground', isRefreshing && 'animate-spin')}
              aria-hidden="true"
            />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultima atualizacao</p>
              <p className="text-sm font-medium text-foreground">{lastUpdateLabel}</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {isLongRunning
            ? 'Esta analise esta demorando mais do que o normal. Se continuar assim, voce pode atualizar manualmente ou voltar mais tarde.'
            : 'Voce pode manter esta pagina aberta ou voltar mais tarde. O relatorio aparece automaticamente quando finalizar.'}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isRefreshing}
            onClick={() => {
              setNow(Date.now())
              setIsRefreshing(true)
              startTransition(() => {
                router.refresh()
              })
            }}
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar agora'}
          </Button>
          <Link
            href="/app/history"
            className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 justify-center')}
          >
            Voltar ao historico
          </Link>
        </div>
      </div>
    </div>
  )
}
