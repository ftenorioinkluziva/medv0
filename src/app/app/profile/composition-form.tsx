import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Activity, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react'
import type { MedicalProfile, BodyCompositionHistoryRecord } from '@/lib/db/schema'
import type { BodyCompositionDelta } from '@/lib/db/queries/body-composition'

interface CompositionFormProps {
  initialData: MedicalProfile | null
  latestBodyComposition: BodyCompositionHistoryRecord | null
  bodyCompositionDelta: BodyCompositionDelta | null
}

function formatValue(value: string | number | null, decimals: number = 1): string {
  if (value == null) return 'N/A'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? 'N/A' : num.toFixed(decimals)
}

function getDeltaIcon(delta: string | null) {
  if (delta == null) return <Minus className="size-3 text-muted-foreground" />
  const numDelta = parseFloat(delta)
  if (numDelta > 0) return <TrendingUp className="size-3 text-green-500" />
  if (numDelta < 0) return <TrendingDown className="size-3 text-red-500" />
  return <Minus className="size-3 text-muted-foreground" />
}

function formatDelta(delta: string | null, unit: string = ''): string {
  if (delta == null) return ''
  const num = parseFloat(delta)
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(1)}${unit}`
}

export function CompositionForm({
  initialData: _initialData,
  latestBodyComposition,
  bodyCompositionDelta
}: CompositionFormProps) {
  const hasInBody = latestBodyComposition != null

  return (
    <div className="space-y-4">
      {/* Status do InBody */}
      <Card className="rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-sm bg-blue-500/10 border border-blue-500/20 px-2 py-1 text-[10px] font-semibold tracking-wider text-blue-500 uppercase">
              ⚡ InBody
            </span>
            <span className="text-sm text-muted-foreground">
              {hasInBody ? 'Conectado' : 'Não conectado'}
            </span>
          </div>
          <Link
            href="/app/profile/body-composition"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8"
          >
            Ver histórico
          </Link>
        </div>
      </Card>

      {/* Composição Atual */}
      {hasInBody && (
        <Card className="rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-foreground">Composição Atual</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dados da última medição InBody.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Peso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Peso</span>
                {bodyCompositionDelta?.weight != null && getDeltaIcon(bodyCompositionDelta.weight)}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-foreground tabular-nums">
                  {formatValue(latestBodyComposition.weight, 1)}
                </span>
                <span className="text-xs text-muted-foreground">kg</span>
              </div>
              {bodyCompositionDelta?.weight != null && (
                <span className="text-xs text-muted-foreground">
                  {formatDelta(bodyCompositionDelta.weight, 'kg')}
                </span>
              )}
            </div>

            {/* Gordura Corporal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gordura Corporal</span>
                {bodyCompositionDelta?.bodyFat != null && getDeltaIcon(bodyCompositionDelta.bodyFat)}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-foreground tabular-nums">
                  {formatValue(latestBodyComposition.bodyFat, 1)}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              {bodyCompositionDelta?.bodyFat != null && (
                <span className="text-xs text-muted-foreground">
                  {formatDelta(bodyCompositionDelta.bodyFat, '%')}
                </span>
              )}
            </div>

            {/* Massa Muscular */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Massa Muscular</span>
                {bodyCompositionDelta?.muscleMass != null && getDeltaIcon(bodyCompositionDelta.muscleMass)}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-foreground tabular-nums">
                  {formatValue(latestBodyComposition.muscleMass, 1)}
                </span>
                <span className="text-xs text-muted-foreground">kg</span>
              </div>
              {bodyCompositionDelta?.muscleMass != null && (
                <span className="text-xs text-muted-foreground">
                  {formatDelta(bodyCompositionDelta.muscleMass, 'kg')}
                </span>
              )}
            </div>

            {/* TMB */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Taxa Metabólica Basal</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-foreground tabular-nums">
                  {formatValue(latestBodyComposition.bmr, 0)}
                </span>
                <span className="text-xs text-muted-foreground">kcal</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Medição realizada em {new Date(latestBodyComposition.measuredAt + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
        </Card>
      )}

      {/* Sem InBody */}
      {!hasInBody && (
        <Card className="rounded-2xl p-4 shadow-sm space-y-4">
          <div className="text-center space-y-3">
            <Activity className="size-8 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold text-foreground">Sem dados de composição</h3>
              <p className="text-sm text-muted-foreground">
                Conecte um dispositivo InBody para acompanhar sua composição corporal detalhada.
              </p>
            </div>
            <Link
              href="/app/profile/body-composition"
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9"
            >
              <Plus className="size-4 mr-2" />
              Adicionar medição manual
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}