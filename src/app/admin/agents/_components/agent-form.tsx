'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createAgentAction, updateAgentAction } from '../_actions/agents'
import type { HealthAgent } from '@/lib/db/schema'

interface AgentFormProps {
  agent?: HealthAgent
}

export function AgentForm({ agent }: AgentFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [temperature, setTemperature] = useState(
    agent ? parseFloat(String(agent.temperature)) : 0.7,
  )
  const [analysisRole, setAnalysisRole] = useState<string>(
    agent?.analysisRole ?? 'specialized',
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('temperature', String(temperature))
    formData.set('analysisRole', analysisRole)

    startTransition(async () => {
      const result = agent
        ? await updateAgentAction(agent.id, formData)
        : await createAgentAction(formData)

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(agent ? 'Agente atualizado com sucesso' : 'Agente criado com sucesso')
        router.push('/admin/agents')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={agent?.name}
            placeholder="Ex: Medicina Integrativa"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialty">Especialidade *</Label>
          <Input
            id="specialty"
            name="specialty"
            defaultValue={agent?.specialty}
            placeholder="Ex: Medicina Funcional"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={agent?.description ?? ''}
          placeholder="Descrição pública do agente (opcional)"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemPrompt">
          System Prompt *{' '}
          <span className="text-xs text-muted-foreground">(mín. 50 chars)</span>
        </Label>
        <Textarea
          id="systemPrompt"
          name="systemPrompt"
          defaultValue={agent?.systemPrompt}
          placeholder="Defina a identidade, comportamento e especialidade do agente..."
          rows={8}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role *</Label>
          <Select
            value={analysisRole}
            onValueChange={(v: string | null) => {
              if (v !== null) setAnalysisRole(v)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="foundation">Foundation</SelectItem>
              <SelectItem value="specialized">Specialized</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Modelo *</Label>
          <Input
            id="model"
            name="model"
            defaultValue={agent?.model ?? 'google/gemini-2.5-flash'}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>
          Temperature:{' '}
          <span className="font-mono">{temperature.toFixed(1)}</span>
        </Label>
        <Slider
          value={[temperature]}
          onValueChange={(v) => {
            const val = Array.isArray(v) ? v[0] : v
            if (typeof val === 'number') setTemperature(val)
          }}
          min={0}
          max={1}
          step={0.1}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            name="maxTokens"
            type="number"
            defaultValue={agent?.maxTokens ?? ''}
            placeholder="(padrão do modelo)"
            min={1}
          />
        </div>
        {analysisRole === 'foundation' && (
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={agent?.sortOrder ?? 0}
              min={0}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          defaultChecked={agent?.isActive ?? true}
          className="h-4 w-4"
        />
        <Label htmlFor="isActive">Ativo</Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : agent ? 'Salvar Alterações' : 'Criar Agente'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/agents')}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
