'use client'

import { AlertTriangle, CalendarClock, Pill } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Supplement {
  name: string
  dosage: string
  timing: string
  purpose: string
  interactions?: string[]
}

interface SupplementPlan {
  overview: string
  supplements: Supplement[]
  reviewDate?: string
  warnings?: string[]
  notes?: string
}

function SupplementCard({ supplement }: { supplement: Supplement }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <Pill className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold">{supplement.name}</span>
        </div>
        <Badge variant="secondary" className="text-xs">{supplement.dosage}</Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Horário:</span> {supplement.timing}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{supplement.purpose}</p>

      {supplement.interactions && supplement.interactions.length > 0 && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2 py-1.5 space-y-1">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Interações:</p>
          <ul className="space-y-0.5">
            {supplement.interactions.map((item, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function SupplementPlanView({ data }: { data: unknown }) {
  const plan = data as SupplementPlan

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{plan.overview ?? ''}</p>

      {plan.warnings && plan.warnings.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-xs font-semibold text-destructive">Avisos importantes</span>
          </div>
          <ul className="space-y-1">
            {plan.warnings.map((w, i) => (
              <li key={i} className="text-xs text-destructive flex gap-2">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plan.supplements?.map((s, i) => (
          <SupplementCard key={i} supplement={s} />
        ))}
      </div>

      {plan.reviewDate && (
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Revisão recomendada: <span className="font-medium text-foreground">{plan.reviewDate}</span>
          </p>
        </div>
      )}

      {plan.notes && (
        <p className="text-xs text-muted-foreground italic border-t pt-2">{plan.notes}</p>
      )}
    </div>
  )
}
