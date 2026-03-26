'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { completeOnboarding } from '@/lib/actions/onboarding'

interface ProfileStepProps {
  onNext: () => void
}

export function ProfileStep({ onNext }: ProfileStepProps) {
  const { update } = useSession()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)

    const age = parseInt(formData.get('age') as string, 10)
    const height = parseInt(formData.get('height') as string, 10)
    const weight = formData.get('weight') as string
    const gender = formData.get('gender') as string
    const systolicPressure = parseInt(formData.get('systolicPressure') as string, 10)
    const diastolicPressure = parseInt(formData.get('diastolicPressure') as string, 10)
    const restingHeartRate = parseInt(formData.get('restingHeartRate') as string, 10)
    const healthObjectives = formData.get('healthObjectives') as string

    startTransition(async () => {
      const result = await completeOnboarding({
        age,
        gender: gender as 'masculino' | 'feminino' | 'outro',
        height,
        weight,
        systolicPressure,
        diastolicPressure,
        restingHeartRate,
        healthObjectives,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      await update({ onboardingCompleted: true })
      onNext()
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Seu Perfil de Saúde</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados básicos para sua primeira análise
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="age">Idade</Label>
            <Input id="age" name="age" type="number" min={0} max={150} required placeholder="Ex: 35" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gender">Sexo biológico</Label>
            <select
              id="gender"
              name="gender"
              required
              defaultValue=""
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" disabled>Selecionar</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="height">Altura (cm)</Label>
            <Input id="height" name="height" type="number" min={1} max={300} required placeholder="Ex: 175" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input id="weight" name="weight" type="number" min={1} step="0.01" required placeholder="Ex: 70.5" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="systolicPressure">Pressão sistólica (mmHg)</Label>
            <Input id="systolicPressure" name="systolicPressure" type="number" min={1} max={300} required placeholder="Ex: 120" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="diastolicPressure">Pressão diastólica (mmHg)</Label>
            <Input id="diastolicPressure" name="diastolicPressure" type="number" min={1} max={200} required placeholder="Ex: 80" />
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="restingHeartRate">Frequência cardíaca em repouso (bpm)</Label>
            <Input id="restingHeartRate" name="restingHeartRate" type="number" min={1} required placeholder="Ex: 65" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="healthObjectives">Objetivos de saúde</Label>
          <textarea
            id="healthObjectives"
            name="healthObjectives"
            required
            rows={3}
            placeholder="Descreva seus objetivos de saúde (ex: perder peso, melhorar condicionamento...)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" aria-live="polite">{error}</p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Salvando...' : 'Continuar'}
        </Button>
      </form>
    </div>
  )
}
