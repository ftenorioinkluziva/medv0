import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { getLatestProductByType } from '@/lib/db/queries/generated-products'
import { ProductEmptyState } from '../_components/product-empty-state'

interface Exercise {
  name: string
  sets?: string
  reps?: string
  weight?: string
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
  weeklyFrequency?: number
  defaultDuration?: string
  objective?: string
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
  const startIndex = workouts.findIndex((w) => w.day === todayName)
  if (startIndex === -1) return workouts
  return [...workouts.slice(startIndex), ...workouts.slice(0, startIndex)]
}

function isTodayDay(dayName: string): boolean {
  return dayName === WEEKDAY_ORDER[new Date().getDay()]
}

function exerciseLine(ex: Exercise): string {
  const parts: string[] = []
  if (ex.sets) parts.push(`${ex.sets} séries`)
  if (ex.reps) parts.push(`· ${ex.reps} reps`)
  if (ex.weight) parts.push(`· ${ex.weight}`)
  if (ex.duration) parts.push(`· ${ex.duration}`)
  return parts.join(' ')
}

export default async function WorkoutPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const product = await getLatestProductByType(session.user.id, 'workout')

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex items-center justify-between h-14 px-4 bg-background">
          <Link href="/app/products" className="font-heading text-[15px] font-semibold text-foreground">
            ← Treino
          </Link>
        </div>
        <div className="px-4">
          <ProductEmptyState label="plano de treino" />
        </div>
      </main>
    )
  }

  const data = product.content as WorkoutContent
  const workouts = sortWorkoutsFromToday(data.workouts ?? [])

  const createdDate = new Date(product.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const frequency = data.weeklyFrequency ?? workouts.length
  const defaultDuration = data.defaultDuration ?? workouts[0]?.duration ?? ''
  const objective = data.objective ?? data.weeklyGoal ?? ''

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 bg-background">
        <Link href="/app/products" className="font-heading text-[15px] font-semibold text-foreground">
          ← Treino
        </Link>
        <span className="text-[11px] font-medium text-muted-foreground">{createdDate}</span>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {/* Resumo Semanal */}
        <div className="rounded-[16px] border border-border bg-card overflow-hidden">
          <div className="flex items-center h-13 px-5 border-b border-border">
            <span className="font-heading text-[14px] font-semibold text-foreground">📋 Resumo Semanal</span>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4">
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col items-center gap-1 rounded-[12px] bg-[#F2F3F0] dark:bg-muted py-3">
                <span className="font-heading text-[20px] font-bold text-primary leading-none">{frequency}</span>
                <span className="text-[11px] font-medium text-muted-foreground">treinos/semana</span>
              </div>
              {defaultDuration && (
                <div className="flex-1 flex flex-col items-center gap-1 rounded-[12px] bg-[#F2F3F0] dark:bg-muted py-3">
                  <span className="font-heading text-[20px] font-bold text-foreground leading-none">{defaultDuration}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">duração</span>
                </div>
              )}
            </div>
            {objective && (
              <div className="rounded-[12px] bg-[#F2F3F0] dark:bg-muted px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Objetivo</p>
                <p className="text-[13px] font-medium text-foreground leading-snug">{objective}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dias de treino */}
        {workouts.map((workout, i) => (
          <details
            key={i}
            open={isTodayDay(workout.day)}
            className="group rounded-[16px] border border-border bg-card overflow-hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between h-13 px-5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-heading text-[14px] font-semibold text-foreground truncate">
                  💪 {workout.type}
                </span>
                {isTodayDay(workout.day) && (
                  <span className="text-[11px] font-medium text-primary shrink-0">· Hoje</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-medium text-muted-foreground">{workout.day}</span>
                <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </div>
            </summary>

            <div className="flex flex-col gap-1.5 px-5 pb-4">
              {workout.warmup && (
                <div className="rounded-[10px] bg-[#F2F3F0] dark:bg-muted px-3 py-2 mb-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Aquecimento</p>
                  <p className="text-[12px] text-foreground/80">{workout.warmup}</p>
                </div>
              )}

              {workout.exercises?.map((ex, j) => {
                const line = exerciseLine(ex)
                return (
                  <div key={j} className="rounded-[10px] bg-[#F2F3F0] dark:bg-muted px-3 py-2">
                    <p className="font-heading text-[13px] font-medium text-foreground">{ex.name}</p>
                    {line && (
                      <p className="text-[11px] font-medium text-muted-foreground">{line}</p>
                    )}
                    {ex.notes && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{ex.notes}</p>
                    )}
                  </div>
                )
              })}

              {workout.cooldown && (
                <div className="rounded-[10px] bg-[#F2F3F0] dark:bg-muted px-3 py-2 mt-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Desaquecimento</p>
                  <p className="text-[12px] text-foreground/80">{workout.cooldown}</p>
                </div>
              )}
            </div>
          </details>
        ))}

        {/* Dicas de progressão */}
        {data.progressionTips && data.progressionTips.length > 0 && (
          <div className="rounded-[16px] border border-border bg-card overflow-hidden">
            <div className="flex items-center h-13 px-5 border-b border-border">
              <span className="font-heading text-[14px] font-semibold text-foreground">📈 Progressão</span>
            </div>
            <div className="flex flex-col gap-2 px-5 py-4">
              {data.progressionTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <p className="text-[13px] font-medium text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground text-center pb-2">
          Este plano é gerado por IA para fins educacionais e não substitui avaliação de profissional de educação física.
        </p>
      </div>
    </main>
  )
}
