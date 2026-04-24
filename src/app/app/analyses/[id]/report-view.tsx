'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronUp, Brain, Stethoscope, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { ReportAccordion } from './report-accordion'
import { getStructuredComponent } from '@/components/structured-outputs/registry'

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
  sourceFileName?: string
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

function SpecialistMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-foreground mt-4 mb-1.5 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-foreground leading-relaxed mb-2">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-4 space-y-1 mb-2 text-sm">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-4 space-y-1 mb-2 text-sm">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-md border border-border">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-2.5 py-2 text-left font-semibold text-foreground border-b border-border whitespace-nowrap">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-2 text-foreground border-b border-border last:border-b-0 align-top">{children}</td>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-muted/20">{children}</tr>
          ),
          hr: () => <hr className="my-3 border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-amber-500 pl-3 py-1 my-2 bg-amber-500/5 rounded-r text-xs text-muted-foreground">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
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
      <div id={panelId} hidden={!open} className="px-4 pb-4 pt-3 border-t">
        <SpecialistMarkdown content={item.content} />
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
  sourceFileName,
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

      {sourceFileName && (
        <p className="text-[11px] text-muted-foreground truncate" title={sourceFileName}>
          Arquivo-base: {sourceFileName}
        </p>
      )}

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
