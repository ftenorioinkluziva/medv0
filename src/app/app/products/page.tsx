import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import Link from 'next/link'
import { Pill, UtensilsCrossed, Dumbbell, ChevronRight, Clock } from 'lucide-react'
import { getLatestProductsSummary } from '@/lib/db/queries/generated-products'
import { cn } from '@/lib/utils'

const PRODUCT_META = {
  supplementation: {
    label: 'Suplementação',
    description: 'Plano personalizado de suplementos baseado no seu perfil',
    Icon: Pill,
    href: '/app/products/supplementation',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  meals: {
    label: 'Plano Alimentar',
    description: 'Cardápio semanal com macros e modo de preparo',
    Icon: UtensilsCrossed,
    href: '/app/products/meals',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  workout: {
    label: 'Treino',
    description: 'Programa de treino semanal baseado na sua composição corporal',
    Icon: Dumbbell,
    href: '/app/products/workout',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
} as const

export default async function ProductsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const summaries = await getLatestProductsSummary(session.user.id)
  const summaryMap = Object.fromEntries(summaries.map((s) => [s.productType, s]))

  return (
    <main className="min-h-screen bg-background">
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Meus Produtos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerados automaticamente após cada análise
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {(Object.keys(PRODUCT_META) as Array<keyof typeof PRODUCT_META>).map((type) => {
            const { label, description, Icon, href, color, bg } = PRODUCT_META[type]
            const summary = summaryMap[type]
            const hasProduct = Boolean(summary)

            return (
              <Link
                key={type}
                href={href}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors',
                  hasProduct ? 'hover:bg-muted/50' : 'opacity-60 pointer-events-none',
                )}
                aria-disabled={!hasProduct}
                tabIndex={hasProduct ? 0 : -1}
              >
                <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', bg)}>
                  <Icon className={cn('size-6', color)} aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
                  {summary && (
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="size-3" aria-hidden="true" />
                      {new Date(summary.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  {!hasProduct && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Disponível após a primeira análise
                    </p>
                  )}
                </div>

                {hasProduct && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
