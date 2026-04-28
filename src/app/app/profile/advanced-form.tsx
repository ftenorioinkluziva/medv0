'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { TagInput } from './tag-input'
import type { MedicalProfile } from '@/lib/db/schema'

interface AdvancedFormProps {
  initialData: MedicalProfile | null
  onSupplementationChange: (values: string[]) => void
}

export function AdvancedForm({ initialData, onSupplementationChange }: AdvancedFormProps) {
  const [smokingStatus, setSmokingStatus] = useState(initialData?.smokingStatus ?? '')
  const [alcoholConsumption, setAlcoholConsumption] = useState(initialData?.alcoholConsumption ?? '')

  return (
    <div className="flex flex-col gap-3">
      {/* Sono */}
      <Card className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">Sono</h2>
          <p className="text-[12px] font-medium text-muted-foreground">Qualidade e padrões de sono.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sleepHours">Horas de sono</Label>
            <Input
              id="sleepHours"
              name="sleepHours"
              type="number"
              step="0.5"
              min={0}
              max={24}
              defaultValue={initialData?.sleepHours ?? ''}
              placeholder="7.5"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sleepQuality">Qualidade (1-10)</Label>
            <Input
              id="sleepQuality"
              name="sleepQuality"
              type="number"
              min={1}
              max={10}
              defaultValue={initialData?.sleepQuality ?? ''}
              placeholder="8"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timeInBed">Tempo na cama (h)</Label>
            <Input
              id="timeInBed"
              name="timeInBed"
              type="number"
              step="0.5"
              min={0}
              max={24}
              defaultValue={initialData?.timeInBed ?? ''}
              placeholder="8.0"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sleepRegularity">Regularidade</Label>
            <Input
              id="sleepRegularity"
              name="sleepRegularity"
              defaultValue={initialData?.sleepRegularity ?? ''}
              placeholder="regular"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sleepIssues">Problemas de sono</Label>
          <Input
            id="sleepIssues"
            name="sleepIssues"
            defaultValue={initialData?.sleepIssues ?? ''}
            placeholder="insônia, roncos"
          />
        </div>
      </Card>

      {/* Hábitos */}
      <Card className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">Hábitos</h2>
          <p className="text-[12px] font-medium text-muted-foreground">Alimentação, substâncias e bem-estar.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dailyWaterIntake">Água/dia (litros)</Label>
            <Input
              id="dailyWaterIntake"
              name="dailyWaterIntake"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initialData?.dailyWaterIntake ?? ''}
              placeholder="2.0"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stressLevel">Nível de estresse</Label>
            <Input
              id="stressLevel"
              name="stressLevel"
              type="number"
              min={1}
              max={10}
              defaultValue={initialData?.stressLevel ?? ''}
              placeholder="5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="smokingStatus">Tabagismo</Label>
            <Select name="smokingStatus" value={smokingStatus} onValueChange={(v) => setSmokingStatus(v ?? '')}>
              <SelectTrigger id="smokingStatus">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nunca_fumou">Nunca fumou</SelectItem>
                <SelectItem value="ex-fumante">Ex-fumante</SelectItem>
                <SelectItem value="fumante">Fumante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alcoholConsumption">Álcool</Label>
            <Select name="alcoholConsumption" value={alcoholConsumption} onValueChange={(v) => setAlcoholConsumption(v ?? '')}>
              <SelectTrigger id="alcoholConsumption">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nunca">Nunca</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="frequente">Frequente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* hidden smokingDetails — kept for form data compatibility */}
        <input type="hidden" name="smokingDetails" value={initialData?.smokingDetails ?? ''} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currentDiet">Dieta atual</Label>
          <Input
            id="currentDiet"
            name="currentDiet"
            defaultValue={initialData?.currentDiet ?? ''}
            placeholder="low carb, mediterrânea"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stressManagement">Gestão de estresse</Label>
          <Input
            id="stressManagement"
            name="stressManagement"
            defaultValue={initialData?.stressManagement ?? ''}
            placeholder="meditação, exercício"
          />
        </div>

        <TagInput
          id="supplementation"
          label="Suplementação"
          placeholder="+ adicionar"
          initialValues={initialData?.supplementation}
          onChange={onSupplementationChange}
        />
      </Card>

      {/* Cronobiologia */}
      <Card className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">Cronobiologia</h2>
          <p className="text-[12px] font-medium text-muted-foreground">Horários no formato HH:MM.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstSunlightExposureTime">1ª exposição solar</Label>
            <Input
              id="firstSunlightExposureTime"
              name="firstSunlightExposureTime"
              type="time"
              defaultValue={initialData?.firstSunlightExposureTime ?? ''}
            />
          </div>
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="artificialLightExposureStart">Luz artificial início</Label>
            <Input
              id="artificialLightExposureStart"
              name="artificialLightExposureStart"
              type="time"
              defaultValue={initialData?.artificialLightExposureStart ?? ''}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="artificialLightExposureEnd">Luz artificial fim</Label>
            <Input
              id="artificialLightExposureEnd"
              name="artificialLightExposureEnd"
              type="time"
              defaultValue={initialData?.artificialLightExposureEnd ?? ''}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="artificialLightExposureTime">Obs. exposição à luz</Label>
          <Input
            id="artificialLightExposureTime"
            name="artificialLightExposureTime"
            defaultValue={initialData?.artificialLightExposureTime ?? ''}
            placeholder="tela de celular até 23h"
          />
        </div>
      </Card>
    </div>
  )
}
