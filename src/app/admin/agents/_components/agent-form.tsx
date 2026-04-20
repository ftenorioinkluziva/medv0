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
import type { ModelConfig } from '@/lib/db/schema'

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
  const [outputType, setOutputType] = useState<string>(agent?.outputType ?? 'text')
  const [outputSchemaError, setOutputSchemaError] = useState<string>('')

  const initialModelConfig = agent?.modelConfig
    ? JSON.stringify(agent.modelConfig as ModelConfig, null, 2)
    : ''
  const [modelConfigJson, setModelConfigJson] = useState(initialModelConfig)
  const [outputSchemaJson, setOutputSchemaJson] = useState(
    agent?.outputSchema ? JSON.stringify(agent.outputSchema, null, 2) : '',
  )

  const SUPPORTED_PROVIDERS = new Set(['google', 'openai', 'anthropic'])
  const initialModel = agent?.model ?? 'google/gemini-2.5-flash'
  const initialSlashIndex = initialModel.indexOf('/')
  const parsedProvider =
    initialSlashIndex !== -1 ? initialModel.slice(0, initialSlashIndex).toLowerCase() : 'google'
  const [provider, setProvider] = useState<string>(
    SUPPORTED_PROVIDERS.has(parsedProvider) ? parsedProvider : 'google',
  )
  const [modelSlug, setModelSlug] = useState<string>(
    initialSlashIndex !== -1 ? initialModel.slice(initialSlashIndex + 1) : 'gemini-2.5-flash',
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (outputType === 'structured') {
      if (!outputSchemaJson.trim()) {
        setOutputSchemaError('Output Schema obrigatório para agentes estruturados')
        return
      }
      try {
        JSON.parse(outputSchemaJson)
        setOutputSchemaError('')
      } catch {
        setOutputSchemaError('Output Schema deve ser JSON válido')
        return
      }
    }

    const formData = new FormData(e.currentTarget)
    formData.set('temperature', String(temperature))
    formData.set('analysisRole', analysisRole)
    formData.set('outputType', outputType)
    formData.set('modelConfig', modelConfigJson)
    formData.set('outputSchema', outputSchemaJson)

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
          <span className="text-xs text-muted-foreground">(mín. 50 chars — usado na análise)</span>
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

      <div className="space-y-2">
        <Label htmlFor="chatPrompt">
          Chat Prompt{' '}
          <span className="text-xs text-muted-foreground">(opcional — usado no chat com paciente; se vazio, usa System Prompt)</span>
        </Label>
        <Textarea
          id="chatPrompt"
          name="chatPrompt"
          defaultValue={agent?.chatPrompt ?? ''}
          placeholder="Tom conversacional, sem formato rígido de seções. Se vazio, o chat usará o System Prompt."
          rows={8}
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
          <Label>Modelo *</Label>
          <div className="flex gap-2">
            <Select value={provider} onValueChange={(v: string | null) => { if (v !== null) setProvider(v) }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={modelSlug}
              onChange={(e) => setModelSlug(e.target.value)}
              placeholder="ex: gemini-2.5-flash"
              required
              className="flex-1"
            />
          </div>
          {provider && modelSlug && (
            <p className="text-xs text-muted-foreground font-mono">{provider}/{modelSlug}</p>
          )}
          <input type="hidden" name="model" value={`${provider}/${modelSlug}`} />
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
        {analysisRole === 'foundation' ? (
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
        ) : (
          <input type="hidden" name="sortOrder" value={agent?.sortOrder ?? 0} />
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

      <div className="space-y-4 border rounded-lg p-4">
        <h3 className="text-sm font-semibold">Configuração Avançada</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="topP">Top P</Label>
            <Input
              id="topP"
              type="number"
              step="0.01"
              min="0"
              max="1"
              placeholder="(padrão)"
              defaultValue={(agent?.modelConfig as ModelConfig | null)?.topP ?? ''}
              onChange={(e) => {
                const config: ModelConfig = modelConfigJson
                  ? (JSON.parse(modelConfigJson) as ModelConfig)
                  : {}
                if (e.target.value) config.topP = parseFloat(e.target.value)
                else delete config.topP
                setModelConfigJson(Object.keys(config).length > 0 ? JSON.stringify(config) : '')
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="topK">Top K</Label>
            <Input
              id="topK"
              type="number"
              step="1"
              min="0"
              placeholder="(padrão)"
              defaultValue={(agent?.modelConfig as ModelConfig | null)?.topK ?? ''}
              onChange={(e) => {
                const config: ModelConfig = modelConfigJson
                  ? (JSON.parse(modelConfigJson) as ModelConfig)
                  : {}
                if (e.target.value) config.topK = parseInt(e.target.value, 10)
                else delete config.topK
                setModelConfigJson(Object.keys(config).length > 0 ? JSON.stringify(config) : '')
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seed">Seed</Label>
            <Input
              id="seed"
              type="number"
              step="1"
              placeholder="(aleatório)"
              defaultValue={(agent?.modelConfig as ModelConfig | null)?.seed ?? ''}
              onChange={(e) => {
                const config: ModelConfig = modelConfigJson
                  ? (JSON.parse(modelConfigJson) as ModelConfig)
                  : {}
                if (e.target.value) config.seed = parseInt(e.target.value, 10)
                else delete config.seed
                setModelConfigJson(Object.keys(config).length > 0 ? JSON.stringify(config) : '')
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequencyPenalty">Frequency Penalty</Label>
            <Input
              id="frequencyPenalty"
              type="number"
              step="0.01"
              min="-2"
              max="2"
              placeholder="(padrão)"
              defaultValue={(agent?.modelConfig as ModelConfig | null)?.frequencyPenalty ?? ''}
              onChange={(e) => {
                const config: ModelConfig = modelConfigJson
                  ? (JSON.parse(modelConfigJson) as ModelConfig)
                  : {}
                if (e.target.value) config.frequencyPenalty = parseFloat(e.target.value)
                else delete config.frequencyPenalty
                setModelConfigJson(Object.keys(config).length > 0 ? JSON.stringify(config) : '')
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presencePenalty">Presence Penalty</Label>
            <Input
              id="presencePenalty"
              type="number"
              step="0.01"
              min="-2"
              max="2"
              placeholder="(padrão)"
              defaultValue={(agent?.modelConfig as ModelConfig | null)?.presencePenalty ?? ''}
              onChange={(e) => {
                const config: ModelConfig = modelConfigJson
                  ? (JSON.parse(modelConfigJson) as ModelConfig)
                  : {}
                if (e.target.value) config.presencePenalty = parseFloat(e.target.value)
                else delete config.presencePenalty
                setModelConfigJson(Object.keys(config).length > 0 ? JSON.stringify(config) : '')
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tipo de Output</Label>
          <Select value={outputType} onValueChange={(v: string | null) => { if (v) setOutputType(v) }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto (Markdown)</SelectItem>
              <SelectItem value="structured">Estruturado (JSON)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {outputType === 'structured' && (
          <div className="space-y-2">
            <Label htmlFor="outputSchemaField">
              Output Schema (JSON Schema) *
            </Label>
            <Textarea
              id="outputSchemaField"
              value={outputSchemaJson}
              onChange={(e) => {
                setOutputSchemaJson(e.target.value)
                if (outputSchemaError) setOutputSchemaError('')
              }}
              placeholder={'{\n  "type": "object",\n  "properties": {}\n}'}
              rows={8}
              className="font-mono text-sm"
            />
            {outputSchemaError && (
              <p className="text-sm text-destructive">{outputSchemaError}</p>
            )}
            {outputSchemaJson && !outputSchemaError && (
              (() => {
                try {
                  JSON.parse(outputSchemaJson)
                  return <p className="text-xs text-green-600">✓ JSON válido</p>
                } catch {
                  return <p className="text-xs text-destructive">JSON inválido</p>
                }
              })()
            )}
          </div>
        )}
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
