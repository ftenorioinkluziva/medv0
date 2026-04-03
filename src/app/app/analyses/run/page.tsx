'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

  const documentId = useMemo(() => searchParams.get('documentId') ?? '', [searchParams])

  useEffect(() => {
    let cancelled = false

    async function runAnalysis(): Promise<void> {
      if (!documentId || !isUuid(documentId)) {
        if (!cancelled) {
          setState({ status: 'error', message: 'Documento invalido para iniciar analise.' })
        }
        return
      }

      try {
        const response = await fetch('/api/analyses/run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ documentId }),
        })

        const payload = (await response.json()) as { completeAnalysisId?: string; error?: string }

        if (!response.ok || !payload.completeAnalysisId) {
          if (!cancelled) {
            setState({
              status: 'error',
              message: payload.error ?? 'Nao foi possivel iniciar a analise agora.',
            })
          }
          return
        }

        router.replace(`/app/analyses/${payload.completeAnalysisId}`)
      } catch {
        if (!cancelled) {
          setState({ status: 'error', message: 'Falha de conexao ao iniciar a analise.' })
        }
      }
    }

    void runAnalysis()

    return () => {
      cancelled = true
    }
  }, [documentId, router])

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border bg-card p-6 text-center">
          {state.status === 'running' ? (
            <div className="space-y-3">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden="true" />
              <p className="font-medium text-foreground">Iniciando sua analise...</p>
              <p className="text-sm text-muted-foreground">Voce sera redirecionado automaticamente em instantes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-medium text-foreground">Nao foi possivel iniciar a analise</p>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <div className="pt-2">
                <Link href="/app" className={cn(buttonVariants({ size: 'sm' }), 'min-h-11')}>
                  Voltar ao dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
