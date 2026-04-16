import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { getBodyCompositionById } from '@/lib/db/queries/body-composition'

interface Metric {
  label: string
  value: string | number | null
  unit: string
}

function MetricRow({ label, value, unit }: Metric) {
  if (value == null) return null

  const display =
    typeof value === 'number'
      ? value.toFixed(0)
      : isNaN(parseFloat(value))
        ? value
        : parseFloat(value).toFixed(1)

  return (
    <div className="flex items-center justify-between py-3 border-b border-foreground/6 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">
        {display} {unit}
      </span>
    </div>
  )
}

export default async function BodyCompositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const { id } = await params
  const record = await getBodyCompositionById(id, session.user.id)

  if (!record) redirect('/app/profile')

  const measuredDate = new Date(record.measuredAt + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const metrics: Metric[] = [
    { label: 'Peso', value: record.weight, unit: 'kg' },
    { label: 'Gordura Corporal', value: record.bodyFat, unit: '%' },
    { label: 'Massa Muscular', value: record.muscleMass, unit: 'kg' },
    { label: 'Gordura Visceral', value: record.visceralFat, unit: 'nível' },
    { label: 'Massa Óssea', value: record.boneMass, unit: 'kg' },
    { label: 'Taxa Metabólica Basal (TMB)', value: record.bmr, unit: 'kcal' },
    { label: 'Água Corporal', value: record.bodyWater, unit: '%' },
  ]

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/profile"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Voltar ao perfil"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Perfil
          </Link>
        </div>

        <div className="rounded-xl border border-foreground/10 bg-card p-4 shadow-sm space-y-1">
          <div className="flex items-center gap-2 pb-3 border-b border-foreground/8">
            <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <h1 className="font-semibold text-foreground">Composição Corporal</h1>
              <p className="text-xs text-muted-foreground">{measuredDate}</p>
            </div>
          </div>

          <div data-testid="bc-detail-metrics">
            {metrics.map((m) => (
              <MetricRow key={m.label} label={m.label} value={m.value} unit={m.unit} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
