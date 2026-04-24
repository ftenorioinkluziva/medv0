'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from './tag-input'
import type { MedicalProfile } from '@/lib/db/schema'

interface BasicFormProps {
  initialData: MedicalProfile | null
  onMedicalConditionsChange: (values: string[]) => void
  onMedicationsChange: (values: string[]) => void
  onAllergiesChange: (values: string[]) => void
  onSurgeriesChange: (values: string[]) => void
}

export function BasicForm({
  initialData,
  onMedicalConditionsChange,
  onMedicationsChange,
  onAllergiesChange,
  onSurgeriesChange
}: BasicFormProps) {
  const [height, setHeight] = useState<number | null>(initialData?.height ?? null)
  const [weightStr, setWeightStr] = useState(parseStr(initialData?.weight))

  function parseStr(val: string | null | undefined): string {
    if (val == null) return ''
    const n = parseFloat(val)
    return isNaN(n) ? '' : String(n)
  }

  const weight = weightStr ? parseFloat(weightStr) : null
  const bmi = height && weight ? ((weight / (height / 100) ** 2)).toFixed(1) : null

  return (
    <div className="space-y-4">
      {/* Identificação */}
      <Card className="rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Identificação</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dados básicos pessoais e medidas corporais.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="age">Idade</Label>
            <Input
              id="age"
              name="age"
              type="number"
              required
              min={0}
              max={150}
              defaultValue={initialData?.age ?? ''}
              placeholder="35"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gender">Sexo biológico</Label>
            <select
              id="gender"
              name="gender"
              required
              defaultValue={initialData?.gender ?? ''}
              className="h-8 w-full bg-transparent border border-input rounded-lg px-2.5 text-sm text-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="" disabled>Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="height">Altura (cm)</Label>
            <Input
              id="height"
              name="height"
              type="number"
              required
              min={1}
              max={300}
              value={height || ''}
              onChange={(e) => setHeight(Number(e.target.value))}
              placeholder="175"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              required
              step="0.01"
              min={1}
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              placeholder="72.5"
            />
          </div>
        </div>

        {bmi && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">IMC</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">{bmi}</span>
            <span className="text-xs text-muted-foreground/50">kg/m²</span>
          </div>
        )}
      </Card>

      {/* Cardiovascular */}
      <Card className="rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Cardiovascular</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pressão arterial e frequência cardíaca.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="systolicPressure">Sistólica</Label>
            <Input
              id="systolicPressure"
              name="systolicPressure"
              type="number"
              required
              min={1}
              max={300}
              defaultValue={initialData?.systolicPressure ?? ''}
              placeholder="120"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="diastolicPressure">Diastólica</Label>
            <Input
              id="diastolicPressure"
              name="diastolicPressure"
              type="number"
              required
              min={1}
              max={200}
              defaultValue={initialData?.diastolicPressure ?? ''}
              placeholder="80"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="restingHeartRate">FC Repouso</Label>
            <Input
              id="restingHeartRate"
              name="restingHeartRate"
              type="number"
              required
              min={1}
              defaultValue={initialData?.restingHeartRate ?? ''}
              placeholder="70"
            />
          </div>
        </div>
      </Card>

      {/* Objetivos */}
      <Card className="rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Objetivos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Metas de saúde e histórico familiar.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="healthObjectives">Objetivos de saúde</Label>
            <Textarea
              id="healthObjectives"
              name="healthObjectives"
              required
              rows={3}
              defaultValue={initialData?.healthObjectives ?? ''}
              placeholder="Perder peso, controlar pressão, melhorar condicionamento..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="familyHistory">Histórico familiar</Label>
            <Textarea
              id="familyHistory"
              name="familyHistory"
              rows={2}
              defaultValue={initialData?.familyHistory ?? ''}
              placeholder="Diabetes no pai, hipertensão na mãe..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={initialData?.notes ?? ''}
              placeholder="Outras informações relevantes..."
            />
          </div>
        </div>
      </Card>

      {/* Histórico Médico */}
      <Card className="rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Histórico Médico</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Condições, medicamentos e alergias.
          </p>
        </div>

        <div className="space-y-4">
          <TagInput
            id="medicalConditions"
            label="Condições médicas"
            placeholder="hipertensão, diabetes..."
            initialValues={initialData?.medicalConditions}
            onChange={onMedicalConditionsChange}
          />
          <TagInput
            id="medications"
            label="Medicamentos"
            placeholder="metformina 500mg..."
            initialValues={initialData?.medications}
            onChange={onMedicationsChange}
          />
          <TagInput
            id="allergies"
            label="Alergias"
            placeholder="penicilina, látex..."
            initialValues={initialData?.allergies}
            onChange={onAllergiesChange}
          />
          <TagInput
            id="surgeries"
            label="Cirurgias"
            placeholder="apendicectomia 2015..."
            initialValues={initialData?.surgeries}
            onChange={onSurgeriesChange}
          />
        </div>
      </Card>
    </div>
  )
}