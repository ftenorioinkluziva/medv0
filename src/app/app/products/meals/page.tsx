import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { ArrowLeft, Clock, AlertCircle, ChevronDown } from 'lucide-react'
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

const WEEKDAY_ORDER = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function normalizeMacros(value: unknown): Meal['macros'] {
  let raw: unknown = value

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      raw = null
    }
  }

  const record = asRecord(raw)
  if (!record) return undefined

  const protein = toStringValue(record.protein)
  const carbs = toStringValue(record.carbs)
  const fats = toStringValue(record.fats ?? record.fat)

  if (!protein && !carbs && !fats) return undefined
  return { protein, carbs, fats }
}

function normalizeMeal(value: unknown): Meal | null {
  const record = asRecord(value)
  if (!record) return null

  const foods = toStringArray(record.foods)
  const ingredients = toStringArray(record.ingredients)
  const normalizedIngredients = ingredients.length > 0 ? ingredients : foods

  const name =
    toStringValue(record.name) ||
    toStringValue(record.title) ||
    toStringValue(record.meal) ||
    normalizedIngredients[0] ||
    'Refeição'

  const instructions =
    toStringValue(record.instructions) ||
    toStringValue(record.preparation) ||
    toStringValue(record.notes)

  const calories = toStringValue(record.calories)

  return {
    name,
    calories,
    ingredients: normalizedIngredients,
    instructions,
    macros: normalizeMacros(record.macros),
  }
}

function formatCalories(value: string): string {
  if (!value) return ''
  const normalized = value.trim()
  return /kcal/i.test(normalized) ? normalized : `${normalized} kcal`
}

function mealPreview(meal: Meal): string {
  if (meal.ingredients.length === 0) return meal.instructions
  return meal.ingredients.slice(0, 2).join(' • ')
}

function sortDaysFromToday(days: DayPlan[]): DayPlan[] {
  if (days.length <= 1) return days

  const todayIndex = new Date().getDay()
  const todayName = WEEKDAY_ORDER[todayIndex]
  const startIndex = days.findIndex((day) => day.day === todayName)

  if (startIndex === -1) return days

  return [...days.slice(startIndex), ...days.slice(0, startIndex)]
}

function isTodayDay(dayName: string): boolean {
  return dayName === WEEKDAY_ORDER[new Date().getDay()]
}

function getCurrentMealKey(): string | null {
  const hour = new Date().getHours()

  if (hour < 10) return 'breakfast'
  if (hour < 12) return 'morning_snack'
  if (hour < 15) return 'lunch'
  if (hour < 18) return 'afternoon_snack'
  if (hour < 22) return 'dinner'

  return 'supper'
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
  const days = sortDaysFromToday(data.weekly_plan ?? [])
  const currentMealKey = getCurrentMealKey()

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
          <div className="rounded-3xl border border-border bg-card p-5 space-y-3 shadow-sm">
            {data.daily_calories_avg && (
              <div className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Media diaria: {data.daily_calories_avg}
              </div>
            )}
            {data.overview && (
              <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
            )}
          </div>
        )}

        {days.length > 0 && (
          <section className="space-y-4">
            {days.map((day, dayIdx) => {
              const orderedMeals = MEAL_ORDER
                .filter((key) => day.meals?.[key])
                .map((key) => ({ key, meal: normalizeMeal(day.meals[key]) }))
                .filter((item): item is { key: string; meal: Meal } => Boolean(item.meal))

              const extraMeals = Object.entries(day.meals ?? {})
                .filter(([key]) => !MEAL_ORDER.includes(key))
                .map(([key, meal]) => ({ key, meal: normalizeMeal(meal) }))
                .filter((item): item is { key: string; meal: Meal } => Boolean(item.meal))

              const allMeals = [...orderedMeals, ...extraMeals]

              return (
                <details
                  key={dayIdx}
                  open={isTodayDay(day.day)}
                  className="group rounded-3xl border border-border bg-card/80 shadow-sm backdrop-blur-sm transition-colors open:border-emerald-500/40 open:bg-card"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
                          {day.day}
                        </h2>
                        {isTodayDay(day.day) && (
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Hoje
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {allMeals.length} refeicoes planejadas
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                        Dia {dayIdx + 1}
                      </div>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-border/70 p-4 pt-4">
                    {allMeals.map(({ key, meal }) => (
                      <details
                        key={key}
                        open={isTodayDay(day.day) && key === currentMealKey}
                        className={`group rounded-3xl border bg-card shadow-sm transition-colors open:bg-card/95 ${
                          isTodayDay(day.day) && key === currentMealKey
                            ? 'border-violet-500/50 bg-violet-500/[0.06] open:border-violet-500/60'
                            : 'border-border open:border-emerald-500/30'
                        }`}
                      >
                        <summary className="cursor-pointer list-none p-4">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                  {MEAL_LABELS[key] ?? key}
                                </span>
                                {isTodayDay(day.day) && key === currentMealKey && (
                                  <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                                    Agora
                                  </span>
                                )}
                                {meal.calories && (
                                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                    {formatCalories(meal.calories)}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-sm font-semibold leading-tight text-foreground line-clamp-2">{meal.name}</p>
                                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                                  {mealPreview(meal)}
                                </p>
                              </div>
                              {meal.macros && (
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                  {meal.macros.protein && (
                                    <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-600 dark:text-blue-400">
                                      Prot {meal.macros.protein}
                                    </span>
                                  )}
                                  {meal.macros.carbs && (
                                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-600 dark:text-amber-400">
                                      Carb {meal.macros.carbs}
                                    </span>
                                  )}
                                  {meal.macros.fats && (
                                    <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-600 dark:text-rose-400">
                                      Gord {meal.macros.fats}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                          </div>
                        </summary>
                        <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
                          {meal.ingredients?.length > 0 && (
                            <div className="rounded-2xl bg-muted/40 p-3">
                              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Ingredientes</p>
                              <ul className="space-y-1.5">
                                {meal.ingredients.map((ing, i) => (
                                  <li key={i} className="text-xs leading-relaxed text-foreground/80">
                                    {ing}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {meal.instructions && (
                            <div className="rounded-2xl bg-muted/40 p-3">
                              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Modo de preparo</p>
                              <p className="text-xs text-foreground/80 leading-relaxed">{meal.instructions}</p>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
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
