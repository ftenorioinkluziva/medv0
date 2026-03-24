'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upsertMedicalProfile } from '@/lib/actions/medical-profile'
import type { MedicalProfile } from '@/lib/db/schema'

interface ProfileFormProps {
  initialData: MedicalProfile | null
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    startTransition(async () => {
      const result = await upsertMedicalProfile({
        age: Number(fd.get('age')),
        gender: fd.get('gender') as 'masculino' | 'feminino' | 'outro',
        height: Number(fd.get('height')),
        weight: String(fd.get('weight')),
        systolicPressure: Number(fd.get('systolicPressure')),
        diastolicPressure: Number(fd.get('diastolicPressure')),
        restingHeartRate: Number(fd.get('restingHeartRate')),
        healthObjectives: String(fd.get('healthObjectives')),
        familyHistory: String(fd.get('familyHistory') ?? ''),
        notes: String(fd.get('notes') ?? ''),
      })

      if (result.success) {
        showToast('success', 'Perfil salvo com sucesso!')
      } else {
        showToast('error', result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {toast && (
        <div
          role="status"
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-foreground">Dados Básicos</h2>

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
              placeholder="Ex: 35"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="gender">Sexo</Label>
            <select
              id="gender"
              name="gender"
              required
              defaultValue={initialData?.gender ?? ''}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              defaultValue={initialData?.height ?? ''}
              placeholder="Ex: 175"
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
              defaultValue={initialData?.weight ?? ''}
              placeholder="Ex: 72.5"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-foreground">Dados Cardiovasculares</h2>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="systolicPressure">PA Sistólica</Label>
            <Input
              id="systolicPressure"
              name="systolicPressure"
              type="number"
              required
              min={1}
              defaultValue={initialData?.systolicPressure ?? ''}
              placeholder="120"
            />
            <p className="text-xs text-muted-foreground">mmHg</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="diastolicPressure">PA Diastólica</Label>
            <Input
              id="diastolicPressure"
              name="diastolicPressure"
              type="number"
              required
              min={1}
              defaultValue={initialData?.diastolicPressure ?? ''}
              placeholder="80"
            />
            <p className="text-xs text-muted-foreground">mmHg</p>
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
            <p className="text-xs text-muted-foreground">bpm</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-foreground">Objetivos e Histórico</h2>

        <div className="space-y-1">
          <Label htmlFor="healthObjectives">Objetivos de Saúde</Label>
          <textarea
            id="healthObjectives"
            name="healthObjectives"
            required
            rows={3}
            defaultValue={initialData?.healthObjectives ?? ''}
            placeholder="Ex: Perder peso, controlar pressão arterial, melhorar condicionamento físico"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="familyHistory">Histórico Familiar (opcional)</Label>
          <textarea
            id="familyHistory"
            name="familyHistory"
            rows={2}
            defaultValue={initialData?.familyHistory ?? ''}
            placeholder="Ex: Diabetes tipo 2 no pai, hipertensão na mãe"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={initialData?.notes ?? ''}
            placeholder="Outras informações relevantes"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>
      </Card>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Salvando...' : 'Salvar Perfil'}
      </Button>
    </form>
  )
}
