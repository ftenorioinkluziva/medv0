'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { MedicalProfile, ExerciseActivity } from '@/lib/db/schema'

interface PerformanceFormProps {
  initialData: MedicalProfile | null
  onActivitiesChange: (activities: ExerciseActivity[]) => void
}

interface ActivityWithId extends ExerciseActivity {
  _id: string
}

const emptyActivity = (): ActivityWithId => ({
  _id: crypto.randomUUID(),
  type: '',
  frequency: 3,
  duration: 30,
  intensity: 'moderada',
})

export function PerformanceForm({ initialData, onActivitiesChange }: PerformanceFormProps) {
  const [activities, setActivities] = useState<ActivityWithId[]>(() => {
    const existing = (initialData?.exerciseActivities as ExerciseActivity[] | null) ?? []
    return existing.map((a) => ({ ...a, _id: crypto.randomUUID() }))
  })

  function addActivity() {
    const updated = [...activities, emptyActivity()]
    setActivities(updated)
    onActivitiesChange(updated.map(({ _id: _, ...rest }) => rest))
  }

  function removeActivity(id: string) {
    const updated = activities.filter((a) => a._id !== id)
    setActivities(updated)
    onActivitiesChange(updated.map(({ _id: _, ...rest }) => rest))
  }

  function updateActivity(id: string, field: keyof ExerciseActivity, value: string | number) {
    const updated = activities.map((a) =>
      a._id === id ? { ...a, [field]: value } : a,
    )
    setActivities(updated)
    onActivitiesChange(updated.map(({ _id: _, ...rest }) => rest))
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Testes Funcionais</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Opcional — testes de capacidade funcional.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="handgripStrength">Força de preensão (kgf)</Label>
            <Input
              id="handgripStrength"
              name="handgripStrength"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.handgripStrength ?? ''}
              placeholder="Ex: 42.5"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sitToStandTime">Sentar-levantar (s)</Label>
            <Input
              id="sitToStandTime"
              name="sitToStandTime"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.sitToStandTime ?? ''}
              placeholder="Ex: 12.3"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="vo2Max">VO2 máx (ml/kg/min)</Label>
            <Input
              id="vo2Max"
              name="vo2Max"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.vo2Max ?? ''}
              placeholder="Ex: 45.0"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="co2ToleranceTest">Tolerância CO2 (s)</Label>
            <Input
              id="co2ToleranceTest"
              name="co2ToleranceTest"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.co2ToleranceTest ?? ''}
              placeholder="Ex: 40"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Atividade Física</h2>
          <Button type="button" variant="outline" size="sm" onClick={addActivity}>
            + Adicionar
          </Button>
        </div>

        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma atividade adicionada.</p>
        )}

        {activities.map((activity, index) => (
          <div key={activity._id} className="rounded-md border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Atividade {index + 1}</span>
              <button
                type="button"
                onClick={() => removeActivity(activity._id)}
                className="text-xs text-destructive hover:underline"
              >
                Remover
              </button>
            </div>

            <div className="space-y-1">
              <Label>Tipo</Label>
              <Input
                value={activity.type}
                onChange={(e) => updateActivity(activity._id, 'type', e.target.value)}
                placeholder="Ex: corrida, musculação, yoga"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Freq. (dias/sem)</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={activity.frequency}
                  onChange={(e) => updateActivity(activity._id, 'frequency', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={activity.duration}
                  onChange={(e) => updateActivity(activity._id, 'duration', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label>Intensidade</Label>
                <select
                  value={activity.intensity}
                  onChange={(e) => updateActivity(activity._id, 'intensity', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="leve">Leve</option>
                  <option value="moderada">Moderada</option>
                  <option value="intensa">Intensa</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <div className="space-y-1">
          <Label htmlFor="physicalLimitations">Limitações físicas</Label>
          <Input
            id="physicalLimitations"
            name="physicalLimitations"
            defaultValue={initialData?.physicalLimitations ?? ''}
            placeholder="Ex: dor no joelho direito, hérnia de disco"
          />
        </div>
      </Card>
    </div>
  )
}
