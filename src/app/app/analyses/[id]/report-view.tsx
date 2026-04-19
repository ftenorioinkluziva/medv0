'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Brain, Stethoscope, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { ReportAccordion } from './report-accordion'
import { getStructuredComponent } from '@/components/structured-outputs/registry'
import { MessageResponse } from '@/components/ai-elements/message'

interface StructuredAnalysis {
  agentName: string
  specialty: string
  data: unknown
}

interface SpecializedTextAnalysis {
  agentName: string
  specialty: string
  content: string
  createdAt: Date
}

interface ReportViewProps {
  reportMarkdown: string
  version: number
  createdAt: Date
  foundationAgentName?: string
  foundationGeneratedAt?: Date
  specializedTotal: number
  specializedCompleted: number
  specializedTimeout: number
  specializedError: number
  structuredAnalyses?: StructuredAnalysis[]
  specializedTextAnalyses?: SpecializedTextAnalysis[]
}

function AgentStatusBadge({
  icon,
  label,
  sublabel,
  status,
  count,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  status: 'ok' | 'partial' | 'error'
  count?: number
}) {
  const statusColor = {
    ok: 'text-emerald-500',
    partial: 'text-amber-500',
    error: 'text-destructive',
  }[status]

  const StatusIcon = {
    ok: CheckCircle2,
    partial: Clock,
    error: AlertCircle,
  }[status]

  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 flex-1 min-w-0">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground truncate">{sublabel}</p>}
      </div>
      <div className={`flex items-center gap-1 shrink-0 ${statusColor}`}>
        <StatusIcon className="w-3.5 h-3.5" />
        {count !== undefined && <span className="text-[11px] font-medium">{count}</span>}
      </div>
    </div>
  )
}

function SpecialistCard({ item }: { item: SpecializedTextAnalysis }) {
  const [open, setOpen] = useState(false)
  const panelId = `specialist-panel-${item.agentName.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Stethoscope className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.agentName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{item.specialty}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      <div id={panelId} hidden={!open} className="px-4 pb-4 pt-1 border-t text-sm">
        <MessageResponse content={item.content} />
        <p className="text-[11px] text-muted-foreground italic border-t pt-2 mt-3">
          Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional.
        </p>
      </div>
    </div>
  )
}

function StructuredCard({ item }: { item: StructuredAnalysis }) {
  const [open, setOpen] = useState(false)
  const Component = getStructuredComponent(item.agentName)
  const panelId = `structured-panel-${item.agentName.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Stethoscope className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.agentName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{item.specialty}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      <div id={panelId} hidden={!open} className="px-4 pb-4 pt-2 border-t space-y-3">
        <Component data={item.data} />
        <p className="text-[11px] text-muted-foreground italic border-t pt-2">
          Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional.
        </p>
      </div>
    </div>
  )
}

export function ReportView({
  reportMarkdown,
  version,
  createdAt,
  foundationAgentName,
  foundationGeneratedAt,
  specializedTotal,
  specializedCompleted,
  specializedTimeout,
  specializedError,
  structuredAnalyses = [],
  specializedTextAnalyses = [],
}: ReportViewProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const foundationDate = foundationGeneratedAt
    ? new Date(foundationGeneratedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null

  const specializedStatus =
    specializedError > 0
      ? 'error'
      : specializedTimeout > 0 || specializedCompleted < specializedTotal
        ? 'partial'
        : 'ok'

  const hasSpecialists = specializedTextAnalyses.length > 0 || structuredAnalyses.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="rounded-full border px-2 py-0.5 text-[11px]">v{version}</span>
        <span>{formattedDate}</span>
      </div>

      <div className="flex gap-2">
        <AgentStatusBadge
          icon={<Brain className="w-4 h-4" />}
          label={foundationAgentName ?? 'Foundation'}
          sublabel={foundationDate ? `Gerado em ${foundationDate}` : undefined}
          status="ok"
        />
        <AgentStatusBadge
          icon={<Stethoscope className="w-4 h-4" />}
          label="Especialistas"
          sublabel={`${specializedCompleted} de ${specializedTotal} concluídos`}
          status={specializedStatus}
          count={specializedTotal}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-0.5">
          Análise de Base
        </p>
        <ReportAccordion markdown={reportMarkdown} />
      </div>

      {hasSpecialists && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-0.5">
            Análises Especializadas
          </p>
          <div className="space-y-2">
            {specializedTextAnalyses.map((item) => (
              <SpecialistCard key={`special-${item.agentName}`} item={item} />
            ))}
            {structuredAnalyses.map((item) => (
              <StructuredCard key={`structured-${item.agentName}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
