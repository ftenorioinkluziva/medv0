'use client'

import { Droplets, UtensilsCrossed } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Macros {
  protein?: string
  carbs?: string
  fat?: string
}

interface Meal {
  meal: string
  time?: string
  foods: string[]
  calories?: number
  macros?: Macros
}

interface NutritionPlan {
  overview: string
  weeklyGoal: string
  meals: Meal[]
  restrictions?: string[]
  hydration?: string
  notes?: string
}

function MealCard({ meal }: { meal: Meal }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-sm font-semibold">{meal.meal}</span>
        <div className="flex flex-wrap gap-1">
          {meal.time && <Badge variant="outline" className="text-xs">{meal.time}</Badge>}
          {meal.calories !== undefined && (
            <Badge variant="secondary" className="text-xs">{meal.calories} kcal</Badge>
          )}
        </div>
      </div>

      <ul className="space-y-0.5">
        {meal.foods.map((food, i) => (
          <li key={i} className="flex gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 shrink-0">•</span>
            <span>{food}</span>
          </li>
        ))}
      </ul>

      {meal.macros && (meal.macros.protein || meal.macros.carbs || meal.macros.fat) && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
          {meal.macros.protein && (
            <span className="text-xs text-muted-foreground">P: {meal.macros.protein}</span>
          )}
          {meal.macros.carbs && (
            <span className="text-xs text-muted-foreground">C: {meal.macros.carbs}</span>
          )}
          {meal.macros.fat && (
            <span className="text-xs text-muted-foreground">G: {meal.macros.fat}</span>
          )}
        </div>
      )}
    </div>
  )
}

export function NutritionPlanView({ data }: { data: unknown }) {
  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-muted-foreground">Dados inválidos</p>
  }
  const plan = data as NutritionPlan

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{plan.overview ?? ''}</p>

      {plan.weeklyGoal && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-xs font-semibold text-primary">Meta semanal</p>
          <p className="text-sm mt-0.5">{plan.weeklyGoal}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plan.meals?.map((meal, i) => (
          <MealCard key={i} meal={meal} />
        ))}
      </div>

      {plan.restrictions && plan.restrictions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Restrições:</span>
          {plan.restrictions.map((r, i) => (
            <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
          ))}
        </div>
      )}

      {plan.hydration && (
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="text-xs text-muted-foreground">{plan.hydration}</p>
        </div>
      )}

      {plan.notes && (
        <p className="text-xs text-muted-foreground italic border-t pt-2">{plan.notes}</p>
      )}
    </div>
  )
}
