'use client'

import Link from 'next/link'
import type { MedicalProfile, BodyCompositionHistoryRecord } from '@/lib/db/schema'
import type { BodyCompositionDelta } from '@/lib/db/queries/body-composition'

interface CompositionFormProps {
  initialData: MedicalProfile | null
  latestBodyComposition: BodyCompositionHistoryRecord | null
  bodyCompositionDelta: BodyCompositionDelta | null
}

function formatValue(value: string | number | null, decimals: number = 1): string {
  if (value == null) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? '—' : num.toFixed(decimals)
}

interface MetricRowProps {
  label: string
  value: string
  last?: boolean
}

function MetricRow({ label, value, last }: MetricRowProps) {
  return (
    <>
      <div className="flex items-center justify-between h-13">
        <span className="text-[14px] font-medium text-muted-foreground">{label}</span>
        <span className="font-heading text-[14px] font-medium text-foreground">{value}</span>
      </div>
      {!last && <div className="h-px bg-border w-full" />}
    </>
  )
}

export function CompositionForm({
  initialData: _initialData,
  latestBodyComposition,
  bodyCompositionDelta: _bodyCompositionDelta,
}: CompositionFormProps) {
  const hasInBody = latestBodyComposition != null

  const measuredDate = hasInBody
    ? new Date(latestBodyComposition.measuredAt + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  const weight = hasInBody ? `${formatValue(latestBodyComposition.weight, 1)} kg` : '—'
  const muscleMass = hasInBody ? `${formatValue(latestBodyComposition.muscleMass, 1)} kg` : '—'
  const bodyFatKg = hasInBody ? `${formatValue(latestBodyComposition.bodyFat, 1)} kg` : '—'
  const bodyFatPct = hasInBody ? `${formatValue(latestBodyComposition.bodyFat, 1)} %` : '—'
  const bmr = hasInBody && latestBodyComposition.bmr != null ? `${latestBodyComposition.bmr} kcal` : '—'

  return (
    <div className="space-y-3">
      {/* InBody status card */}
      <div className="rounded-[16px] border border-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded border border-[#CBCCC9] bg-[#DFDFE6] px-2 py-1 text-[10px] font-semibold text-[#000066]">
            ⚡ InBody
          </span>
          <span className="text-[13px] font-medium text-muted-foreground">
            {hasInBody ? 'Conectado' : 'Não conectado'}
          </span>
        </div>
        <Link
          href="/app/profile/body-composition"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground hover:opacity-80"
        >
          Ver histórico
        </Link>
      </div>

      {/* Metrics card */}
      <div className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        {/* Card header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-xl bg-[#E7E8E5]">
            <span className="font-heading text-[14px] font-medium text-muted-foreground">◎</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-heading text-[15px] font-medium text-foreground">Composição Corporal</span>
            {measuredDate && (
              <span className="text-[12px] font-medium text-muted-foreground">{measuredDate}</span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border w-full" />

        {/* Metric rows */}
        <div className="flex flex-col">
          <MetricRow label="Peso" value={weight} />
          <MetricRow label="Massa Muscular" value={muscleMass} />
          <MetricRow label="Massa de Gordura" value={bodyFatKg} />
          <MetricRow label="Percentual de Gordura" value={bodyFatPct} />
          <MetricRow label="Taxa Metabólica Basal" value={bmr} last />
        </div>
      </div>
    </div>
  )
}
