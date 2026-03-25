'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function UploadStep() {
  const router = useRouter()

  function handleUpload() {
    router.push('/app/documents/upload')
  }

  function handleSkip() {
    router.push('/app/dashboard')
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Primeiro Exame</h1>
        <p className="text-sm text-muted-foreground">
          Faça upload de um exame para sua primeira análise
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-foreground">Por que enviar um exame agora?</h2>
        <p className="text-sm text-muted-foreground">
          Com um exame, os agentes de IA do SAMI podem gerar análises personalizadas
          sobre sua saúde — integrando dados de nutrição, cardiologia e medicina
          integrativa com base nos seus resultados laboratoriais.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Exames de sangue (hemograma, lipidograma, etc.)</li>
          <li>Laudos médicos em PDF ou imagem</li>
          <li>Resultados de bioimpedância ou outros testes</li>
        </ul>
      </Card>

      <div className="space-y-3">
        <Button onClick={handleUpload} className="w-full">
          Enviar Exame
        </Button>
        <Button variant="ghost" onClick={handleSkip} className="w-full text-muted-foreground">
          Pular por agora
        </Button>
      </div>
    </div>
  )
}
