'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { TagInput } from './tag-input'
import type { MedicalProfile, ExerciseActivity } from '@/lib/db/schema'

interface AdvancedFormProps {
  initialData: MedicalProfile | null
  onActivitiesChange: (activities: ExerciseActivity[]) => void
  onSupplementationChange: (values: string[]) => void
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

export function AdvancedForm({ initialData, onActivitiesChange, onSupplementationChange }: AdvancedFormProps) {
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
      {/* Sono */}
      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-foreground">Sono</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="sleepHours">Horas de sono</Label>
            <Input
              id="sleepHours"
              name="sleepHours"
              type="number"
              step="0.5"
              min={0}
              max={24}
              defaultValue={initialData?.sleepHours ?? ''}
              placeholder="Ex: 7.5"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sleepQuality">Qualidade (1-10)</Label>
            <Input
              id="sleepQuality"
              name="sleepQuality"
              type="number"
              min={1}
              max={10}
              defaultValue={initialData?.sleepQuality ?? ''}
              placeholder="Ex: 7"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="timeInBed">Tempo na cama (h)</Label>
            <Input
              id="timeInBed"
              name="timeInBed"
              type="number"
              step="0.5"
              min={0}
              max={24}
              defaultValue={initialData?.timeInBed ?? ''}
              placeholder="Ex: 8.0"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sleepRegularity">Regularidade</Label>
            <Input
              id="sleepRegularity"
              name="sleepRegularity"
              defaultValue={initialData?.sleepRegularity ?? ''}
              placeholder="Ex: regular"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="sleepIssues">Problemas de sono</Label>
          <Input
            id="sleepIssues"
            name="sleepIssues"
            defaultValue={initialData?.sleepIssues ?? ''}
            placeholder="Ex: insônia, roncos"
          />
        </div>
      </Card>

      {/* Hábitos */}
      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-foreground">Hábitos</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="dailyWaterIntake">Água/dia (litros)</Label>
            <Input
              id="dailyWaterIntake"
              name="dailyWaterIntake"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.dailyWaterIntake ?? ''}
              placeholder="Ex: 2.0"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="stressLevel">Nível de estresse (1-10)</Label>
            <Input
              id="stressLevel"
              name="stressLevel"
              type="number"
              min={1}
              max={10}
              defaultValue={initialData?.stressLevel ?? ''}
              placeholder="Ex: 6"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="smokingStatus">Tabagismo</Label>
            <select
              id="smokingStatus"
              name="smokingStatus"
              defaultValue={initialData?.smokingStatus ?? ''}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione</option>
              <option value="nunca_fumou">Nunca fumou</option>
              <option value="ex-fumante">Ex-fumante</option>
              <option value="fumante">Fumante</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="smokingDetails">Detalhes (tabagismo)</Label>
            <Input
              id="smokingDetails"
              name="smokingDetails"
              defaultValue={initialData?.smokingDetails ?? ''}
              placeholder="Ex: 5 cigarros/dia, parou há 2 anos"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="alcoholConsumption">Álcool</Label>
            <select
              id="alcoholConsumption"
              name="alcoholConsumption"
              defaultValue={initialData?.alcoholConsumption ?? ''}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione</option>
              <option value="nunca">Nunca</option>
              <option value="social">Social</option>
              <option value="regular">Regular</option>
              <option value="frequente">Frequente</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="currentDiet">Dieta atual</Label>
          <Input
            id="currentDiet"
            name="currentDiet"
            defaultValue={initialData?.currentDiet ?? ''}
            placeholder="Ex: mediterrânea, low carb, vegetariana"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="stressManagement">Gestão de estresse</Label>
          <Input
            id="stressManagement"
            name="stressManagement"
            defaultValue={initialData?.stressManagement ?? ''}
            placeholder="Ex: meditação, exercício, terapia"
          />
        </div>

        <TagInput
          id="supplementation"
          label="Suplementação"
          placeholder="Ex: vitamina D 2000UI, creatina"
          initialValues={initialData?.supplementation}
          onChange={onSupplementationChange}
        />
      </Card>

      {/* Atividade Física */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Atividade Física</h2>
          <Button type="button" variant="outline" size="sm" onClick={addActivity}>
            + Adicionar atividade
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

      {/* Cronobiologia */}
      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-foreground">Cronobiologia</h2>
        <p className="text-xs text-muted-foreground">Horários no formato HH:MM</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="firstSunlightExposureTime">1ª exposição solar</Label>
            <Input
              id="firstSunlightExposureTime"
              name="firstSunlightExposureTime"
              type="time"
              defaultValue={initialData?.firstSunlightExposureTime ?? ''}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="lastMealTime">Última refeição</Label>
            <Input
              id="lastMealTime"
              name="lastMealTime"
              type="time"
              defaultValue={initialData?.lastMealTime ?? ''}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="artificialLightExposureStart">Luz artificial início</Label>
            <Input
              id="artificialLightExposureStart"
              name="artificialLightExposureStart"
              type="time"
              defaultValue={initialData?.artificialLightExposureStart ?? ''}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="artificialLightExposureEnd">Luz artificial fim</Label>
            <Input
              id="artificialLightExposureEnd"
              name="artificialLightExposureEnd"
              type="time"
              defaultValue={initialData?.artificialLightExposureEnd ?? ''}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="artificialLightExposureTime">Obs. exposição à luz</Label>
          <Input
            id="artificialLightExposureTime"
            name="artificialLightExposureTime"
            defaultValue={initialData?.artificialLightExposureTime ?? ''}
            placeholder="Ex: tela de celular até 23h"
          />
        </div>
      </Card>
    </div>
  )
}
