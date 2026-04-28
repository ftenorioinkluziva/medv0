'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

import { ReportAccordion } from './report-accordion'

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
