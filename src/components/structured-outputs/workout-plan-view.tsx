'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Dumbbell, Moon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Exercise {
  name: string
  sets?: number
  reps?: string
  notes?: string
}

interface Workout {
  day: string
  type: string
  duration?: string
  warmup?: string
  exercises?: Exercise[]
  cooldown?: string
}

interface WorkoutPlan {
  overview: string
  weeklyGoal: string
  workouts: Workout[]
  restDays?: string[]
  progressionTips?: string[]
}

interface CollapsibleSectionProps {
  label: string
  content: string
}

function CollapsibleSection({ label, content }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2 rounded-md border border-border/50 bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span>{label}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <p className="px-3 pb-2 text-xs text-muted-foreground">{content}</p>
      )}
    </div>
  )
}

interface WorkoutCardProps {
  workout: Workout
}

function WorkoutCard({ workout }: WorkoutCardProps) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-sm font-semibold">{workout.day}</span>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">{workout.type}</Badge>
          {workout.duration && (
            <Badge variant="outline" className="text-xs">{workout.duration}</Badge>
          )}
        </div>
      </div>

      {workout.exercises && workout.exercises.length > 0 && (
        <ul className="space-y-1">
          {workout.exercises.map((ex, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="font-medium">{ex.name}</span>
              {(ex.sets !== undefined || ex.reps) && (
                <span className="text-muted-foreground">
                  {ex.sets !== undefined ? `${ex.sets}x` : ''}{ex.reps ?? ''}
                </span>
              )}
              {ex.notes && (
                <span className="text-muted-foreground italic">{ex.notes}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {workout.warmup && <CollapsibleSection label="Aquecimento" content={workout.warmup} />}
      {workout.cooldown && <CollapsibleSection label="Resfriamento" content={workout.cooldown} />}
    </div>
  )
}

export function WorkoutPlanView({ data }: { data: unknown }) {
  const plan = data as WorkoutPlan

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{plan.overview}</p>

      {plan.weeklyGoal && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-xs font-semibold text-primary">Meta semanal</p>
          <p className="text-sm mt-0.5">{plan.weeklyGoal}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plan.workouts?.map((workout, i) => (
          <WorkoutCard key={i} workout={workout} />
        ))}
      </div>

      {plan.restDays && plan.restDays.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Moon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Descanso:</span>
          {plan.restDays.map((day, i) => (
            <Badge key={i} variant="outline" className="text-xs">{day}</Badge>
          ))}
        </div>
      )}

      {plan.progressionTips && plan.progressionTips.length > 0 && (
        <div className="rounded-md border bg-muted/30 px-3 py-3 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Dicas de progressão</span>
          </div>
          <ul className="space-y-1">
            {plan.progressionTips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
