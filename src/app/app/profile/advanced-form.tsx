'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from './tag-input'
import type { MedicalProfile } from '@/lib/db/schema'

interface AdvancedFormProps {
  initialData: MedicalProfile | null
  onSupplementationChange: (values: string[]) => void
}

export function AdvancedForm({ initialData, onSupplementationChange }: AdvancedFormProps) {
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
              placeholder="Ex: 5 cigarros/dia"
            />
          </div>
        </div>

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
