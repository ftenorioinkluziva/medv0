'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface DisclaimerStepProps {
  onNext: () => void
}

export function DisclaimerStep({ onNext }: DisclaimerStepProps) {
  const [accepted, setAccepted] = useState(false)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao SAMI</h1>
        <p className="text-sm text-muted-foreground">
          Sistema de Análise Médica com Inteligência Artificial
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-foreground">O que é o SAMI?</h2>
        <p className="text-sm text-muted-foreground">
          O SAMI usa agentes de IA para analisar seus exames médicos e fornecer
          insights personalizados sobre sua saúde, integrando dados de nutrição,
          cardiologia, exercício físico e medicina integrativa.
        </p>
      </Card>

      <Card className="p-4 border-amber-200 bg-amber-50 space-y-3">
        <h2 className="font-semibold text-amber-900">⚠️ Aviso Importante</h2>
        <p className="text-sm text-amber-800 leading-relaxed">
          As análises geradas pelo SAMI são produzidas por inteligência artificial
          para fins <strong>educacionais e informativos</strong>. Elas{' '}
          <strong>NÃO substituem</strong> consulta médica profissional, diagnóstico
          clínico ou prescrição de tratamentos. Sempre consulte um médico
          qualificado antes de tomar decisões sobre sua saúde.
        </p>
      </Card>

      <div className="flex items-start gap-3">
        <input
          id="accept-disclaimer"
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer"
        />
        <Label htmlFor="accept-disclaimer" className="text-sm leading-snug cursor-pointer">
          Entendi e concordo que as análises do SAMI são para fins educacionais e
          não substituem orientação médica profissional.
        </Label>
      </div>

      <Button
        onClick={onNext}
        disabled={!accepted}
        className="w-full"
      >
        Continuar
      </Button>
    </div>
  )
}
