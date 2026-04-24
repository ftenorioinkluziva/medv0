import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { ArrowLeft, Clock, AlertCircle, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { getLatestProductByType } from '@/lib/db/queries/generated-products'
import { ProductEmptyState } from '../_components/product-empty-state'

interface Exercise {
  name: string
  sets?: string
  reps?: string
  duration?: string
  notes?: string
}

interface Workout {
  day: string
  type: string
  duration: string
  intensity?: string
  warmup?: string
  cooldown?: string
  exercises: Exercise[]
}

interface WorkoutContent {
  overview: string
  weeklyGoal?: string
  restDays?: string[]
  progressionTips?: string[]
  workouts: Workout[]
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

function sortWorkoutsFromToday(workouts: Workout[]): Workout[] {
  if (workouts.length <= 1) return workouts

  const todayName = WEEKDAY_ORDER[new Date().getDay()]
  const startIndex = workouts.findIndex((workout) => workout.day === todayName)

  if (startIndex === -1) return workouts

  return [...workouts.slice(startIndex), ...workouts.slice(0, startIndex)]
}

function isTodayDay(dayName: string): boolean {
  return dayName === WEEKDAY_ORDER[new Date().getDay()]
}

export default async function WorkoutPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const product = await getLatestProductByType(session.user.id, 'workout')

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Link href="/app/products" aria-label="Voltar">
              <ArrowLeft className="size-5 text-muted-foreground" />
            </Link>
            <h1 className="text-xl font-semibold">Plano de Treino</h1>
          </div>
          <ProductEmptyState label="plano de treino" />
        </div>
      </main>
    )
  }

  const data = product.content as WorkoutContent
  const workouts = sortWorkoutsFromToday(data.workouts ?? [])

  return (
    <main className="min-h-screen bg-background">
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/app/products" aria-label="Voltar">
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Plano de Treino</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="size-3" />
              {new Date(product.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {(data.overview || data.weeklyGoal) && (
          <div className="rounded-3xl border border-border bg-card p-5 space-y-3 shadow-sm">
            {data.weeklyGoal && (
              <div className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                Meta semanal: {data.weeklyGoal}
              </div>
            )}
            {data.overview && (
              <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
            )}
          </div>
        )}

        {data.restDays && data.restDays.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Descanso:</span>
            {data.restDays.map((day, i) => (
              <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                {day}
              </span>
            ))}
          </div>
        )}

        {workouts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              Treinos ({workouts.length})
            </h2>
            <div className="flex flex-col gap-3">
              {workouts.map((workout, i) => (
                <details
                  key={i}
                  open={isTodayDay(workout.day)}
                  className={`group rounded-3xl border bg-card shadow-sm transition-colors open:bg-card/95 ${
                    isTodayDay(workout.day)
                      ? 'border-violet-500/50 bg-violet-500/[0.06] open:border-violet-500/60'
                      : 'border-border open:border-blue-500/30'
                  }`}
                >
                  <summary className="cursor-pointer list-none p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                            {workout.day}
                          </span>
                          {isTodayDay(workout.day) && (
                            <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                              Hoje
                            </span>
                          )}
                          {workout.duration && (
                            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                              {workout.duration}
                            </span>
                          )}
                          {workout.intensity && (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                              {workout.intensity}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold leading-tight text-foreground">{workout.type}</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {workout.exercises.length} exercicios planejados
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
                    {workout.warmup && (
                      <div className="rounded-2xl bg-muted/40 p-3">
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Aquecimento</p>
                        <p className="text-xs text-foreground/80">{workout.warmup}</p>
                      </div>
                    )}

                    {workout.exercises?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                          Exercícios ({workout.exercises.length})
                        </p>
                        <div className="flex flex-col gap-2">
                          {workout.exercises.map((ex, j) => (
                            <div key={j} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                {j + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-tight">{ex.name}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {ex.sets && (
                                    <span className="text-[11px] text-muted-foreground">{ex.sets} séries</span>
                                  )}
                                  {ex.reps && (
                                    <span className="text-[11px] text-muted-foreground">× {ex.reps}</span>
                                  )}
                                  {ex.duration && (
                                    <span className="text-[11px] text-muted-foreground">{ex.duration}</span>
                                  )}
                                </div>
                                {ex.notes && (
                                  <p className="text-[11px] text-muted-foreground/70 mt-1 italic">{ex.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {workout.cooldown && (
                      <div className="rounded-2xl bg-muted/40 p-3">
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Desaquecimento</p>
                        <p className="text-xs text-foreground/80">{workout.cooldown}</p>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {data.progressionTips && data.progressionTips.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              Progressão
            </h2>
            <div className="rounded-2xl border border-border bg-card p-4">
              <ul className="space-y-2">
                {data.progressionTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4 flex gap-3">
          <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Este plano de treino é gerado por IA para fins educacionais e não substitui a avaliação de um profissional de educação física ou médico do esporte.
          </p>
        </div>
      </div>
    </main>
  )
}
