import Link from 'next/link'
import { Activity, ArrowRight } from 'lucide-react'
import {
  getLatestBodyComposition,
  getBodyCompositionHistory,
} from '@/lib/db/queries/body-composition'
import type { BodyCompositionHistoryRecord } from '@/lib/db/queries/body-composition'

interface Props {
  userId: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function IndicatorCell({
  label,
  value,
  unit,
  delta,
}: {
  label: string
  value: string | number | null
  unit: string
  delta: string | null
}) {
  if (value == null) return null

  const numericValue = typeof value === 'string' ? parseFloat(value) : value
  const formatted = isNaN(numericValue) ? String(value) : numericValue.toFixed(1)

  const isUp = delta?.startsWith('↑')
  const isDown = delta?.startsWith('↓')

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className="text-sm font-semibold text-foreground">
        {formatted} {unit}
      </span>
      {delta && (
        <span
          className={`text-[11px] ${
            isUp ? 'text-red-500' : isDown ? 'text-green-500' : 'text-muted-foreground'
          }`}
        >
          {delta} vs anterior
        </span>
      )}
    </div>
  )
}

function HistoryRow({ record }: { record: BodyCompositionHistoryRecord }) {
  const values: string[] = []
  if (record.weight) values.push(`${parseFloat(record.weight).toFixed(1)} kg`)
  if (record.bodyFat) values.push(`${parseFloat(record.bodyFat).toFixed(1)}% gord.`)
  if (record.muscleMass) values.push(`${parseFloat(record.muscleMass).toFixed(1)} kg musc.`)

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-t border-foreground/6">
      <span className="text-xs text-muted-foreground shrink-0">{formatDate(record.measuredAt)}</span>
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-end">
          {values.map((v) => (
            <span key={v} className="text-xs text-foreground">
              {v}
            </span>
          ))}
        </div>
        <Link
          href={`/app/profile/body-composition/${record.id}`}
          className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
          aria-label={`Ver detalhes da medição de ${formatDate(record.measuredAt)}`}
        >
          Ver
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

export async function BodyCompositionSection({ userId }: Props) {
  const [{ latest, delta }, history] = await Promise.all([
    getLatestBodyComposition(userId),
    getBodyCompositionHistory(userId, 10),
  ])

  if (!latest) {
    return (
      <div
        className="rounded-xl border border-foreground/10 bg-card p-4 shadow-sm"
        data-testid="body-composition-empty"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-semibold text-foreground">Composição Corporal</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          Envie um exame de bioimpedância para ver seus dados de composição corporal
        </p>
      </div>
    )
  }

  const isSingleRecord = history.length === 1

  return (
    <div
      className="rounded-xl border border-foreground/10 bg-card p-4 shadow-sm space-y-4"
      data-testid="body-composition-section"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-semibold text-foreground">Composição Corporal</h2>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDate(latest.measuredAt)}
        </span>
      </div>

      {isSingleRecord && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
          Primeira medição — futuras medições mostrarão evolução
        </p>
      )}

      <div
        className="grid grid-cols-2 gap-x-6 gap-y-4"
        data-testid="body-composition-indicators"
      >
        <IndicatorCell
          label="Peso"
          value={latest.weight}
          unit="kg"
          delta={delta?.weight ?? null}
        />
        <IndicatorCell
          label="Gordura Corporal"
          value={latest.bodyFat}
          unit="%"
          delta={delta?.bodyFat ?? null}
        />
        <IndicatorCell
          label="Massa Muscular"
          value={latest.muscleMass}
          unit="kg"
          delta={delta?.muscleMass ?? null}
        />
        <IndicatorCell
          label="Gordura Visceral"
          value={latest.visceralFat}
          unit="nível"
          delta={delta?.visceralFat ?? null}
        />
        <IndicatorCell
          label="Massa Óssea"
          value={latest.boneMass}
          unit="kg"
          delta={delta?.boneMass ?? null}
        />
        {latest.bmr != null && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">TMB</span>
            <span className="text-sm font-semibold text-foreground">{latest.bmr} kcal</span>
          </div>
        )}
        <IndicatorCell
          label="Água Corporal"
          value={latest.bodyWater}
          unit="%"
          delta={delta?.bodyWater ?? null}
        />
      </div>

      {/* InBody Advanced Fields */}
      {(latest.proteinMass != null ||
        latest.bodyWaterLiters != null ||
        latest.waistHipRatio != null ||
        latest.obesityDegree != null ||
        latest.inbodyScore != null ||
        latest.idealWeight != null) && (
        <details className="group" data-testid="body-composition-inbody">
          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline list-none flex items-center gap-1 select-none">
            <span className="group-open:hidden">InBody avançado</span>
            <span className="hidden group-open:inline">Ocultar InBody avançado</span>
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
            <IndicatorCell label="Proteína" value={latest.proteinMass} unit="kg" delta={null} />
            <IndicatorCell label="Água Total" value={latest.bodyWaterLiters} unit="L" delta={null} />
            <IndicatorCell label="Cintura-Quadril" value={latest.waistHipRatio} unit="" delta={null} />
            <IndicatorCell label="Grau de Obesidade" value={latest.obesityDegree} unit="%" delta={null} />
            {latest.inbodyScore != null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Pontuação InBody</span>
                <span className="text-sm font-semibold text-foreground">{latest.inbodyScore}</span>
              </div>
            )}
            <IndicatorCell label="Peso Ideal" value={latest.idealWeight} unit="kg" delta={null} />
          </div>
        </details>
      )}

      {/* Segmental Data */}
      {(latest.leanMassArmRight != null ||
        latest.leanMassArmLeft != null ||
        latest.leanMassTrunk != null ||
        latest.leanMassLegRight != null ||
        latest.leanMassLegLeft != null ||
        latest.fatMassArmRight != null ||
        latest.fatMassArmLeft != null ||
        latest.fatMassTrunk != null ||
        latest.fatMassLegRight != null ||
        latest.fatMassLegLeft != null) && (
        <details className="group" data-testid="body-composition-segmental">
          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline list-none flex items-center gap-1 select-none">
            <span className="group-open:hidden">Dados segmentais</span>
            <span className="hidden group-open:inline">Ocultar dados segmentais</span>
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Massa Magra Segmental (kg)</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <IndicatorCell label="Braço Dir." value={latest.leanMassArmRight} unit="kg" delta={null} />
                <IndicatorCell label="Braço Esq." value={latest.leanMassArmLeft} unit="kg" delta={null} />
                <IndicatorCell label="Tronco" value={latest.leanMassTrunk} unit="kg" delta={null} />
                <IndicatorCell label="Perna Dir." value={latest.leanMassLegRight} unit="kg" delta={null} />
                <IndicatorCell label="Perna Esq." value={latest.leanMassLegLeft} unit="kg" delta={null} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Massa Gorda Segmental (kg)</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <IndicatorCell label="Braço Dir." value={latest.fatMassArmRight} unit="kg" delta={null} />
                <IndicatorCell label="Braço Esq." value={latest.fatMassArmLeft} unit="kg" delta={null} />
                <IndicatorCell label="Tronco" value={latest.fatMassTrunk} unit="kg" delta={null} />
                <IndicatorCell label="Perna Dir." value={latest.fatMassLegRight} unit="kg" delta={null} />
                <IndicatorCell label="Perna Esq." value={latest.fatMassLegLeft} unit="kg" delta={null} />
              </div>
            </div>
          </div>
        </details>
      )}

      {history.length > 1 && (
        <details className="group" data-testid="body-composition-history">
          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline list-none flex items-center gap-1 select-none">
            <span className="group-open:hidden">
              Ver histórico ({history.length} medições)
            </span>
            <span className="hidden group-open:inline">Ocultar histórico</span>
          </summary>
          <div className="mt-2">
            {history.map((record) => (
              <HistoryRow key={record.id} record={record} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
