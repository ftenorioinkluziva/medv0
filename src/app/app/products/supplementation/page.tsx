import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { ArrowLeft, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getLatestProductByType } from '@/lib/db/queries/generated-products'
import { ProductEmptyState } from '../_components/product-empty-state'

interface Supplement {
  name: string
  dosage: string
  timing: string
  purpose: string
  duration?: string
}

interface HormonalSupport {
  hormone: string
  strategy: string
  monitoring: string
}

interface SupplementationContent {
  overview: string
  supplements: Supplement[]
  hormonalSupport?: HormonalSupport[]
  nextExamRecommendations?: string[]
}

export default async function SupplementationPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const product = await getLatestProductByType(session.user.id, 'supplementation')

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Link href="/app/products" aria-label="Voltar">
              <ArrowLeft className="size-5 text-muted-foreground" />
            </Link>
            <h1 className="text-xl font-semibold">Suplementação</h1>
          </div>
          <ProductEmptyState label="plano de suplementação" />
        </div>
      </main>
    )
  }

  const data = product.content as SupplementationContent

  return (
    <main className="min-h-screen bg-background">
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/app/products" aria-label="Voltar">
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Suplementação</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="size-3" />
              {new Date(product.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {data.overview && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
          </div>
        )}

        {data.supplements?.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              Suplementos ({data.supplements.length})
            </h2>
            <div className="flex flex-col gap-3">
              {data.supplements.map((s, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight">{s.name}</p>
                    <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                      {s.dosage}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.purpose}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                      ⏰ {s.timing}
                    </span>
                    {s.duration && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                        📅 {s.duration}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.hormonalSupport && data.hormonalSupport.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              Suporte Hormonal
            </h2>
            <div className="flex flex-col gap-3">
              {data.hormonalSupport.map((h, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-1.5">
                  <p className="font-semibold text-sm">{h.hormone}</p>
                  <p className="text-xs text-muted-foreground">{h.strategy}</p>
                  <p className="text-[11px] text-muted-foreground/70 italic">{h.monitoring}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.nextExamRecommendations && data.nextExamRecommendations.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              Exames Recomendados
            </h2>
            <div className="rounded-2xl border border-border bg-card p-4">
              <ul className="space-y-2">
                {data.nextExamRecommendations.map((exam, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden="true" />
                    {exam}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4 flex gap-3">
          <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Consulte seu médico antes de iniciar qualquer suplementação. Este plano é gerado por IA para fins educacionais e não substitui orientação profissional.
          </p>
        </div>
      </div>
    </main>
  )
}
