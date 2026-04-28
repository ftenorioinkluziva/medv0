'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
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
  const [gender, setGender] = useState(initialData?.gender ?? '')

  function parseStr(val: string | null | undefined): string {
    if (val == null) return ''
    const n = parseFloat(val)
    return isNaN(n) ? '' : String(n)
  }

  const weight = weightStr ? parseFloat(weightStr) : null
  const bmi = height && weight ? ((weight / (height / 100) ** 2)).toFixed(1) : null

  return (
    <div className="flex flex-col gap-3">
      {/* Identificação */}
      <Card className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">Identificação</h2>
          <p className="text-[12px] font-medium text-muted-foreground">
            Dados básicos pessoais e medidas corporais.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gender">Sexo biológico</Label>
            <Select name="gender" value={gender} onValueChange={(v) => setGender(v ?? '')}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
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
            <span className="text-[12px] text-muted-foreground">IMC</span>
            <span className="font-heading text-[13px] font-medium text-foreground tabular-nums">{bmi}</span>
            <span className="text-[12px] text-muted-foreground/50">kg/m²</span>
          </div>
        )}
      </Card>

      {/* Cardiovascular */}
      <Card className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">Cardiovascular</h2>
          <p className="text-[12px] font-medium text-muted-foreground">
            Pressão arterial e frequência cardíaca.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
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
      <Card className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">Objetivos</h2>
          <p className="text-[12px] font-medium text-muted-foreground">
            Metas de saúde e histórico familiar.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="familyHistory">Histórico familiar</Label>
            <Textarea
              id="familyHistory"
              name="familyHistory"
              rows={2}
              defaultValue={initialData?.familyHistory ?? ''}
              placeholder="Diabetes no pai, hipertensão na mãe..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
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
      <Card className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">Histórico Médico</h2>
          <p className="text-[12px] font-medium text-muted-foreground">
            Condições, medicamentos e alergias.
          </p>
        </div>

        <div className="flex flex-col gap-3">
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
