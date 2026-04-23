import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { ArrowLeft, Clock, AlertCircle } from 'lucide-react'
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
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            {data.overview && (
              <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
            )}
            {data.weeklyGoal && (
              <p className="text-sm font-medium">
                Meta semanal:{' '}
                <span className="text-blue-600 dark:text-blue-400">{data.weeklyGoal}</span>
              </p>
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

        {data.workouts?.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              Treinos ({data.workouts.length})
            </h2>
            <div className="flex flex-col gap-3">
              {data.workouts.map((workout, i) => (
                <details key={i} className="rounded-2xl border border-border bg-card group">
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{workout.day}</p>
                      <p className="text-sm font-semibold leading-tight">{workout.type}</p>
                    </div>
                    <div className="shrink-0 flex gap-2 ml-3">
                      {workout.duration && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          {workout.duration}
                        </span>
                      )}
                      {workout.intensity && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hidden sm:inline">
                          {workout.intensity}
                        </span>
                      )}
                    </div>
                  </summary>
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {workout.warmup && (
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground mb-1">Aquecimento</p>
                        <p className="text-xs text-foreground/80">{workout.warmup}</p>
                      </div>
                    )}

                    {workout.exercises?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground mb-2">
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
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground mb-1">Desaquecimento</p>
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
