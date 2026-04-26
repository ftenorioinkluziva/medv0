'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
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
    <div className="flex flex-col gap-3">
      {/* Testes Funcionais */}
      <Card className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">Testes Funcionais</h2>
          <p className="text-[12px] font-medium text-muted-foreground">
            Opcional — testes de capacidade funcional.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="handgripStrength">Força de preensão (kgf)</Label>
            <Input
              id="handgripStrength"
              name="handgripStrength"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.handgripStrength ?? ''}
              placeholder="42.5"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sitToStandTime">Sentar-levantar (s)</Label>
            <Input
              id="sitToStandTime"
              name="sitToStandTime"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.sitToStandTime ?? ''}
              placeholder="12.3"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vo2Max">VO2 máx</Label>
            <Input
              id="vo2Max"
              name="vo2Max"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.vo2Max ?? ''}
              placeholder="45.0"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="co2ToleranceTest">Tolerância CO2 (s)</Label>
            <Input
              id="co2ToleranceTest"
              name="co2ToleranceTest"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.co2ToleranceTest ?? ''}
              placeholder="40"
            />
          </div>
        </div>
      </Card>

      {/* Atividade Física */}
      <Card className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">Atividade Física</h2>
          <button
            type="button"
            onClick={addActivity}
            className="rounded-[8px] border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-foreground hover:opacity-80"
          >
            + Adicionar
          </button>
        </div>

        {activities.length === 0 && (
          <p className="text-[13px] text-muted-foreground">Nenhuma atividade adicionada.</p>
        )}

        {activities.map((activity, index) => (
          <div key={activity._id} className="rounded-[12px] border border-border p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-heading text-[13px] font-medium text-foreground">Atividade {index + 1}</span>
              <button
                type="button"
                onClick={() => removeActivity(activity._id)}
                className="text-[12px] font-medium text-[#D93C15] hover:underline"
              >
                Remover
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Input
                value={activity.type}
                onChange={(e) => updateActivity(activity._id, 'type', e.target.value)}
                placeholder="musculação"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label>Freq. (d/sem)</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={activity.frequency}
                  onChange={(e) => updateActivity(activity._id, 'frequency', Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={activity.duration}
                  onChange={(e) => updateActivity(activity._id, 'duration', Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Intensidade</Label>
                <Select
                  value={activity.intensity}
                  onValueChange={(v) => updateActivity(activity._id, 'intensity', v ?? 'moderada')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="moderada">Moderada</SelectItem>
                    <SelectItem value="intensa">Intensa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="physicalLimitations">Limitações físicas</Label>
          <Input
            id="physicalLimitations"
            name="physicalLimitations"
            defaultValue={initialData?.physicalLimitations ?? ''}
            placeholder="dor no joelho direito"
          />
        </div>
      </Card>
    </div>
  )
}
