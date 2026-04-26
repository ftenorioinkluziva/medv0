'use client'

import { useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronUp, Stethoscope } from 'lucide-react'

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
  analysisId: string
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

function extractSection(markdown: string, keyword: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n')
  const regex = new RegExp(`^##\\s*(?:📋\\s*|💡\\s*)?${keyword}[^\\n]*$`, 'im')
  const match = regex.exec(normalized)
  if (!match || match.index == null) return ''
  const body = normalized.slice(match.index + match[0].length).trimStart()
  const next = /^##\s+/m.exec(body)
  return (next ? body.slice(0, next.index) : body).trim()
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
  analysisId,
  reportMarkdown,
  version,
  createdAt,
  sourceFileName,
  foundationAgentName,
  foundationGeneratedAt: _foundationGeneratedAt,
  specializedTotal,
  specializedCompleted,
  specializedTimeout: _specializedTimeout,
  specializedError: _specializedError,
  structuredAnalyses = [],
  specializedTextAnalyses = [],
}: ReportViewProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const summaryText = extractSection(reportMarkdown, 'Resumo')
  const agentSlug = (name: string) => encodeURIComponent(name)
  const allAgents = [
    ...(foundationAgentName
      ? [{ name: foundationAgentName, sublabel: 'Análise completa realizada', href: `/app/analyses/${analysisId}/agent/${agentSlug(foundationAgentName)}` }]
      : []),
    ...specializedTextAnalyses.map((a) => ({
      name: a.agentName,
      sublabel: a.specialty,
      href: `/app/analyses/${analysisId}/agent/${agentSlug(a.agentName)}`,
    })),
    ...structuredAnalyses.map((a) => ({
      name: a.agentName,
      sublabel: a.specialty,
      href: `/app/analyses/${analysisId}/agent/${agentSlug(a.agentName)}`,
    })),
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* header */}
      <div className="flex h-14 items-center justify-between">
        <Link
          href="/app/dashboard"
          className="font-heading text-[15px] font-semibold leading-[1.4286] text-foreground hover:opacity-80"
        >
          ← Análise Completa
        </Link>
        <span className="text-[11px] font-medium text-muted-foreground">{formattedDate}</span>
      </div>

      {/* resumo card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex h-13 items-center px-5">
          <p className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
            📋 Resumo Executivo
          </p>
        </div>
        <div className="px-5 pb-4">
          {summaryText ? (
            <p className="text-[13px] font-medium leading-[1.4286] text-foreground">
              {summaryText.replace(/\*\*/g, '').replace(/^#+\s*/gm, '')}
            </p>
          ) : (
            <div className="text-[13px] leading-[1.4286] text-foreground">
              <ReportAccordion markdown={reportMarkdown} />
            </div>
          )}
          {sourceFileName && (
            <p className="mt-2 text-[11px] font-medium text-muted-foreground truncate">
              v{version} · {sourceFileName}
            </p>
          )}
        </div>
      </div>


      {/* análise base completa (accordion) — quando não há resumo extraído */}
      {!summaryText && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex h-13 items-center px-5">
            <p className="font-heading text-sm font-semibold text-foreground">📄 Análise Completa</p>
          </div>
          <div className="px-5 pb-4">
            <ReportAccordion markdown={reportMarkdown} />
          </div>
        </div>
      )}

      {/* agentes card */}
      {allAgents.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex h-13 items-center justify-between px-5">
            <p className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
              🤖 Agentes
            </p>
            {specializedTotal > 0 && (
              <p className="text-[11px] font-medium text-muted-foreground">
                {specializedCompleted}/{specializedTotal} concluídos
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 px-5 pb-4">
            {allAgents.map((agent) => (
              <Link
                key={agent.name}
                href={agent.href}
                className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5 hover:bg-muted/70 transition-colors"
              >
                <div className="h-2 w-2 shrink-0 rounded-full bg-[#22c55e]" />
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <p className="font-heading text-[13px] font-semibold leading-[1.4286] text-foreground">
                    {agent.name}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">{agent.sublabel}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 -rotate-90" />
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
