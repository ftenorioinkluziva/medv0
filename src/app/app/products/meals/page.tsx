import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { ArrowLeft, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getLatestProductByType } from '@/lib/db/queries/generated-products'
import { ProductEmptyState } from '../_components/product-empty-state'

interface Meal {
  name: string
  calories: string
  ingredients: string[]
  instructions: string
  macros?: { protein?: string; carbs?: string; fats?: string }
}

interface DayPlan {
  day: string
  meals: Record<string, Meal>
}

interface MealsContent {
  overview: string
  daily_calories_avg: string
  weekly_plan: DayPlan[]
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Café da manhã',
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
  pre_workout: 'Pré-treino',
  post_workout: 'Pós-treino',
  dinner: 'Jantar',
  supper: 'Ceia',
}

const MEAL_ORDER = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'pre_workout', 'post_workout', 'dinner', 'supper']

export default async function MealsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const product = await getLatestProductByType(session.user.id, 'meals')

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Link href="/app/products" aria-label="Voltar">
              <ArrowLeft className="size-5 text-muted-foreground" />
            </Link>
            <h1 className="text-xl font-semibold">Plano Alimentar</h1>
          </div>
          <ProductEmptyState label="plano alimentar" />
        </div>
      </main>
    )
  }

  const data = product.content as MealsContent
  const days = data.weekly_plan ?? []

  return (
    <main className="min-h-screen bg-background">
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/app/products" aria-label="Voltar">
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Plano Alimentar</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="size-3" />
              {new Date(product.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {(data.overview || data.daily_calories_avg) && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            {data.overview && (
              <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
            )}
            {data.daily_calories_avg && (
              <p className="text-sm font-medium">
                Média diária:{' '}
                <span className="text-emerald-600 dark:text-emerald-400">{data.daily_calories_avg}</span>
              </p>
            )}
          </div>
        )}

        {days.length > 0 && (
          <section className="space-y-4">
            {days.map((day, dayIdx) => {
              const orderedMeals = MEAL_ORDER
                .filter((key) => day.meals?.[key])
                .map((key) => ({ key, meal: day.meals[key] }))

              const extraMeals = Object.entries(day.meals ?? {})
                .filter(([key]) => !MEAL_ORDER.includes(key))
                .map(([key, meal]) => ({ key, meal }))

              const allMeals = [...orderedMeals, ...extraMeals]

              return (
                <div key={dayIdx} className="space-y-2">
                  <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                    {day.day}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {allMeals.map(({ key, meal }) => (
                      <details key={key} className="rounded-2xl border border-border bg-card group">
                        <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">
                              {MEAL_LABELS[key] ?? key}
                            </p>
                            <p className="text-sm font-semibold leading-tight truncate">{meal.name}</p>
                          </div>
                          {meal.calories && (
                            <span className="shrink-0 ml-3 text-[11px] font-medium rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                              {meal.calories}
                            </span>
                          )}
                        </summary>
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          {meal.ingredients?.length > 0 && (
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Ingredientes</p>
                              <ul className="flex flex-wrap gap-1.5">
                                {meal.ingredients.map((ing, i) => (
                                  <li key={i} className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                                    {ing}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {meal.instructions && (
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground mb-1">Modo de preparo</p>
                              <p className="text-xs text-foreground/80 leading-relaxed">{meal.instructions}</p>
                            </div>
                          )}
                          {meal.macros && (
                            <div className="flex gap-2 pt-1">
                              {meal.macros.protein && (
                                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-600 dark:text-blue-400">
                                  P: {meal.macros.protein}
                                </span>
                              )}
                              {meal.macros.carbs && (
                                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-600 dark:text-amber-400">
                                  C: {meal.macros.carbs}
                                </span>
                              )}
                              {meal.macros.fats && (
                                <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-600 dark:text-rose-400">
                                  G: {meal.macros.fats}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4 flex gap-3">
          <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Este plano alimentar é gerado por IA para fins educacionais e não substitui a avaliação de um nutricionista qualificado.
          </p>
        </div>
      </div>
    </main>
  )
}
