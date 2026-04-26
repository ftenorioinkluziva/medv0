import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import Link from 'next/link'
import { getLatestProductByType } from '@/lib/db/queries/generated-products'
import { ProductEmptyState } from '../_components/product-empty-state'

interface Supplement {
  name: string
  dosage: string
  timing: string
  purpose: string
  duration?: string
  emoji?: string
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

const SUPP_EMOJIS: Record<string, string> = {
  whey: '💊',
  creatina: '⚡',
  'vitamina d': '🌞',
  'vitamina d3': '🌞',
  magnesio: '🌿',
  magnésio: '🌿',
  omega: '🐟',
  ômega: '🐟',
  zinco: '🔬',
  ferro: '🔩',
  colageno: '💉',
  colágeno: '💉',
  probiotico: '🦠',
  probiótico: '🦠',
}

function suppEmoji(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, emoji] of Object.entries(SUPP_EMOJIS)) {
    if (lower.includes(key)) return emoji
  }
  return '💊'
}

export default async function SupplementationPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const product = await getLatestProductByType(session.user.id, 'supplementation')

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex items-center justify-between h-14 px-4 bg-background">
          <Link href="/app/products" className="font-heading text-[15px] font-semibold text-foreground">
            ← Suplementação
          </Link>
        </div>
        <div className="px-4">
          <ProductEmptyState label="plano de suplementação" />
        </div>
      </main>
    )
  }

  const data = product.content as SupplementationContent

  const createdDate = new Date(product.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 bg-background">
        <Link href="/app/products" className="font-heading text-[15px] font-semibold text-foreground">
          ← Suplementação
        </Link>
        <span className="text-[11px] font-medium text-muted-foreground">{createdDate}</span>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {/* Suplementos */}
        {data.supplements?.length > 0 && data.supplements.map((s, i) => {
          const emoji = s.emoji ?? suppEmoji(s.name)
          return (
            <div key={i} className="rounded-[16px] border border-border bg-card overflow-hidden">
              {/* Card header */}
              <div className="flex items-center h-13 px-5 border-b border-border">
                <span className="font-heading text-[14px] font-semibold text-foreground">
                  {emoji} {s.name}
                </span>
              </div>

              {/* Card body */}
              <div className="flex flex-col gap-2 px-5 py-4">
                <p className="text-[13px] font-medium text-foreground leading-snug">{s.purpose}</p>

                <div className="flex gap-2">
                  <div className="flex flex-col gap-0.5 rounded-[10px] bg-[#F2F3F0] dark:bg-muted px-3 py-2 min-w-18">
                    <span className="text-[10px] font-medium text-muted-foreground">Dose</span>
                    <span className="font-heading text-[13px] font-semibold text-foreground">{s.dosage}</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 rounded-[10px] bg-[#F2F3F0] dark:bg-muted px-3 py-2">
                    <span className="text-[10px] font-medium text-muted-foreground">Frequência</span>
                    <span className="text-[12px] font-medium text-foreground leading-snug">{s.timing}</span>
                  </div>
                </div>
                {s.duration && (
                  <div className="rounded-[10px] bg-[#F2F3F0] dark:bg-muted px-3 py-2">
                    <span className="text-[10px] font-medium text-muted-foreground">Duração</span>
                    <p className="text-[12px] font-medium text-foreground leading-snug mt-0.5">{s.duration}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Suporte Hormonal */}
        {data.hormonalSupport && data.hormonalSupport.length > 0 && data.hormonalSupport.map((h, i) => (
          <div key={i} className="rounded-[16px] border border-border bg-card overflow-hidden">
            <div className="flex items-center h-13 px-5 border-b border-border">
              <span className="font-heading text-[14px] font-semibold text-foreground">
                🧬 {h.hormone}
              </span>
            </div>
            <div className="flex flex-col gap-2 px-5 py-4">
              <p className="text-[13px] font-medium text-foreground leading-snug">{h.strategy}</p>
              {h.monitoring && (
                <p className="text-[12px] text-muted-foreground">{h.monitoring}</p>
              )}
            </div>
          </div>
        ))}

        {/* Exames recomendados */}
        {data.nextExamRecommendations && data.nextExamRecommendations.length > 0 && (
          <div className="rounded-[16px] border border-border bg-card overflow-hidden">
            <div className="flex items-center h-13 px-5 border-b border-border">
              <span className="font-heading text-[14px] font-semibold text-foreground">🔬 Exames Recomendados</span>
            </div>
            <div className="flex flex-col gap-1.5 px-5 py-4">
              {data.nextExamRecommendations.map((exam, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <p className="text-[13px] font-medium text-foreground">{exam}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground text-center pb-2">
          Consulte seu médico antes de iniciar qualquer suplementação. Este plano é gerado por IA para fins educacionais.
        </p>
      </div>
    </main>
  )
}
