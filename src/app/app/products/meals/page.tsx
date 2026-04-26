import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { getLatestProductByType } from '@/lib/db/queries/generated-products'
import { ProductEmptyState } from '../_components/product-empty-state'

interface Meal {
  name: string
  calories: string
  protein: string
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
  macros?: { calories?: string; protein?: string; carbs?: string; fat?: string }
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

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '☀️',
  morning_snack: '🍎',
  lunch: '🌞',
  afternoon_snack: '🍌',
  pre_workout: '⚡',
  post_workout: '💪',
  dinner: '🌙',
  supper: '🌛',
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

const WEEKDAY_EMOJIS: Record<string, string> = {
  'Domingo': '🌅',
  'Segunda-feira': '📅',
  'Terça-feira': '📅',
  'Quarta-feira': '📅',
  'Quinta-feira': '📅',
  'Sexta-feira': '📅',
  'Sábado': '🌅',
}

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
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
}

function normalizeMacros(value: unknown): Meal['macros'] {
  let raw: unknown = value
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { raw = null }
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
  const protein = toStringValue(asRecord(record.macros)?.protein ?? '')
  return { name, calories, protein, ingredients: normalizedIngredients, instructions, macros: normalizeMacros(record.macros) }
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

function formatCalories(value: string): string {
  if (!value) return ''
  const normalized = value.trim()
  return /kcal/i.test(normalized) ? normalized : `${normalized} kcal`
}

function mealMacroLine(meal: Meal): string {
  const parts: string[] = []
  if (meal.calories) parts.push(formatCalories(meal.calories))
  if (meal.macros?.protein || meal.protein) parts.push(`${meal.macros?.protein ?? meal.protein}g prot`)
  return parts.join(' · ')
}

export default async function MealsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const product = await getLatestProductByType(session.user.id, 'meals')

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex items-center justify-between h-14 px-4 bg-background">
          <Link href="/app/products" className="font-heading text-[15px] font-semibold text-foreground">
            ← Plano Alimentar
          </Link>
        </div>
        <div className="px-4">
          <ProductEmptyState label="plano alimentar" />
        </div>
      </main>
    )
  }

  const data = product.content as MealsContent
  const days = sortDaysFromToday(data.weekly_plan ?? [])
  const macros = data.macros

  const createdDate = new Date(product.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 bg-background">
        <Link href="/app/products" className="font-heading text-[15px] font-semibold text-foreground">
          ← Plano Alimentar
        </Link>
        <span className="text-[11px] font-medium text-muted-foreground">{createdDate}</span>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {/* Macros Diários */}
        {macros && (
          <div className="rounded-[16px] border border-border bg-card overflow-hidden">
            <div className="flex items-center h-13 px-5">
              <span className="font-heading text-[14px] font-semibold text-foreground">📊 Macros Diários</span>
            </div>
            <div className="flex gap-2 px-5 pb-4">
              {macros.calories && (
                <div className="flex-1 flex flex-col items-center gap-1 rounded-[12px] bg-[#F2F3F0] dark:bg-muted py-3">
                  <span className="font-heading text-[18px] font-bold text-primary leading-none">{macros.calories}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">kcal</span>
                </div>
              )}
              {macros.protein && (
                <div className="flex-1 flex flex-col items-center gap-1 rounded-[12px] bg-[#F2F3F0] dark:bg-muted py-3">
                  <span className="font-heading text-[18px] font-bold text-foreground leading-none">{macros.protein}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">proteína</span>
                </div>
              )}
              {macros.carbs && (
                <div className="flex-1 flex flex-col items-center gap-1 rounded-[12px] bg-[#F2F3F0] dark:bg-muted py-3">
                  <span className="font-heading text-[18px] font-bold text-foreground leading-none">{macros.carbs}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">carbs</span>
                </div>
              )}
              {macros.fat && (
                <div className="flex-1 flex flex-col items-center gap-1 rounded-[12px] bg-[#F2F3F0] dark:bg-muted py-3">
                  <span className="font-heading text-[18px] font-bold text-foreground leading-none">{macros.fat}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">gordura</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dias da semana */}
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
          const emoji = WEEKDAY_EMOJIS[day.day] ?? '📅'

          return (
            <details
              key={dayIdx}
              open={isTodayDay(day.day)}
              className="group rounded-[16px] border border-border bg-card overflow-hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between h-13 px-5">
                <span className="font-heading text-[14px] font-semibold text-foreground">
                  {emoji} {day.day}
                  {isTodayDay(day.day) && (
                    <span className="ml-2 text-[11px] font-medium text-primary">· Hoje</span>
                  )}
                </span>
                <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <div className="flex flex-col gap-2 px-5 pb-4">
                {allMeals.map(({ key, meal }) => {
                  const mealEmoji = MEAL_EMOJIS[key] ?? '🍽️'
                  const label = MEAL_LABELS[key] ?? key
                  const macroLine = mealMacroLine(meal)

                  return (
                    <details key={key} className="group/meal rounded-[12px] bg-[#F2F3F0] dark:bg-muted overflow-hidden">
                      <summary className="cursor-pointer list-none px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-heading text-[12px] font-medium text-muted-foreground">
                            {mealEmoji} {label}
                          </span>
                          <span className="font-heading text-[13px] font-medium text-foreground line-clamp-1">
                            {meal.name}
                          </span>
                          {macroLine && (
                            <span className="text-[11px] font-medium text-[#B8B9B6]">{macroLine}</span>
                          )}
                        </div>
                      </summary>

                      <div className="flex flex-col gap-2 px-3 pb-3 pt-1 border-t border-border/30">
                        {meal.ingredients.length > 0 && (
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Ingredientes</p>
                            <ul className="flex flex-col gap-0.5">
                              {meal.ingredients.map((ing, i) => (
                                <li key={i} className="text-[12px] text-foreground/80">{ing}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {meal.instructions && (
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Preparo</p>
                            <p className="text-[12px] text-foreground/80 leading-relaxed">{meal.instructions}</p>
                          </div>
                        )}
                      </div>
                    </details>
                  )
                })}
              </div>
            </details>
          )
        })}

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground text-center pb-2">
          Este plano alimentar é gerado por IA para fins educacionais e não substitui a avaliação de um nutricionista.
        </p>
      </div>
    </main>
  )
}
