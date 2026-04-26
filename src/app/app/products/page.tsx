import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import Link from 'next/link'
import { getLatestProductsSummary } from '@/lib/db/queries/generated-products'

const PRODUCT_META = {
  supplementation: {
    label: 'Suplementação',
    description: 'Plano personalizado de suplementos',
    emoji: '💊',
    iconBg: 'bg-[#ede9fe]',
    href: '/app/products/supplementation',
  },
  meals: {
    label: 'Plano Alimentar',
    description: 'Cardápio semanal com macros',
    emoji: '🥗',
    iconBg: 'bg-[#d1fae5]',
    href: '/app/products/meals',
  },
  workout: {
    label: 'Treino',
    description: 'Programa semanal baseado na composição',
    emoji: '🏋️',
    iconBg: 'bg-[#dbeafe]',
    href: '/app/products/workout',
  },
} as const

export default async function ProductsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const summaries = await getLatestProductsSummary(session.user.id)
  const summaryMap = Object.fromEntries(summaries.map((s) => [s.productType, s]))

  return (
    <main className="min-h-screen bg-background">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-24">
        <div className="flex flex-col gap-0.5 pt-2">
          <h1 className="font-heading text-[20px] font-bold leading-[1.4286] text-foreground">
            Meus Produtos
          </h1>
          <p className="text-[12px] font-medium text-muted-foreground">
            Gerados automaticamente após cada análise
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {(Object.keys(PRODUCT_META) as Array<keyof typeof PRODUCT_META>).map((type) => {
            const { label, description, emoji, iconBg, href } = PRODUCT_META[type]
            const summary = summaryMap[type]
            const hasProduct = Boolean(summary)

            const dateLabel = summary
              ? new Date(summary.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : null

            return (
              <Link
                key={type}
                href={href}
                className={`flex items-center gap-4 rounded-[16px] border border-border bg-card p-4 transition-colors hover:bg-muted/40 ${!hasProduct ? 'opacity-50 pointer-events-none' : ''}`}
                aria-disabled={!hasProduct}
                tabIndex={hasProduct ? 0 : -1}
              >
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-[12px] ${iconBg}`}>
                  <span className="text-[22px] font-heading">{emoji}</span>
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <p className="font-heading text-[14px] font-semibold leading-[1.4286] text-foreground">
                    {label}
                  </p>
                  <p className="text-[12px] font-medium text-muted-foreground line-clamp-1">
                    {description}
                  </p>
                  {dateLabel && (
                    <p className="text-[11px] font-medium text-[#B8B9B6]">🕒 {dateLabel}</p>
                  )}
                  {!hasProduct && (
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Disponível após a primeira análise
                    </p>
                  )}
                </div>

                {hasProduct && (
                  <span className="text-[16px] font-medium text-primary shrink-0">→</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
