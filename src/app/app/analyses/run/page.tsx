'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useErrorHandler } from '@/hooks/use-error-handler'

type RunState =
  | { status: 'running' }
  | { status: 'error'; message: string }

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default function RunAnalysisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<RunState>({ status: 'running' })
  const { errorMessage, handleError, clearError } = useErrorHandler()

  const documentId = useMemo(() => searchParams.get('documentId') ?? '', [searchParams])

  useEffect(() => {
    let cancelled = false

    async function runAnalysis(): Promise<void> {
      clearError()

      if (!documentId || !isUuid(documentId)) {
        if (!cancelled) {
          const message = 'Documento invalido para iniciar analise.'
          setState({ status: 'error', message })
          handleError(message)
        }
        return
      }

      try {
        const response = await fetch('/api/analyses/run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ documentId }),
        })

        const payload = (await response.json()) as { livingAnalysisId?: string; error?: string }

        if (!response.ok || !payload.livingAnalysisId) {
          if (!cancelled) {
            const message = payload.error ?? 'Nao foi possivel iniciar a analise agora.'
            setState({
              status: 'error',
              message,
            })
            handleError(message)
          }
          return
        }

        router.replace(`/app/analyses/${payload.livingAnalysisId}`)
      } catch {
        if (!cancelled) {
          const message = 'Falha de conexao ao iniciar a analise.'
          setState({ status: 'error', message })
          handleError(message)
        }
      }
    }

    void runAnalysis()

    return () => {
      cancelled = true
    }
  }, [clearError, documentId, handleError, router])

  function retryRun() {
    clearError()
    setState({ status: 'running' })
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background p-4" aria-busy={state.status === 'running'}>
      <div className="mx-auto max-w-2xl">
        <h1 className="sr-only">Iniciar análise</h1>
        <div className="rounded-lg border bg-card p-6 text-center">
          {state.status === 'running' ? (
            <div className="space-y-3" role="status" aria-live="polite">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden="true" />
              <p className="font-medium text-foreground">Iniciando sua analise...</p>
              <p className="text-sm text-muted-foreground">Voce sera redirecionado automaticamente em instantes.</p>
            </div>
          ) : (
            <div className="space-y-3" role="alert" aria-live="assertive">
              <p className="font-medium text-foreground">Nao foi possivel iniciar a analise</p>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              {errorMessage && (
                <p className="text-xs text-destructive" aria-live="polite">
                  {errorMessage}
                </p>
              )}
              <div className="pt-2">
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={retryRun}>
                    Tentar novamente
                  </Button>
                  <Link href="/app" className={cn(buttonVariants({ size: 'sm' }), 'min-h-11')}>
                    Voltar ao dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
