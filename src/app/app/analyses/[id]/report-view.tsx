'use client'

import { ReportAccordion, parseSectionsForToc } from './report-accordion'
import { ReportToc } from './report-toc'
import { getStructuredComponent } from '@/components/structured-outputs/registry'

interface StructuredAnalysis {
  agentName: string
  specialty: string
  data: unknown
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Versão {version}</span>
        <span>{formattedDate}</span>
      </div>
      {foundationAgentName && (
        <div className="rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground">
          Foundation: <span className="font-medium text-foreground">{foundationAgentName}</span>
          {foundationDate ? ` • Gerado em ${foundationDate}` : ''}
        </div>
      )}
      <div className="rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Specialized</span>
        <span> • total {specializedTotal}</span>
        <span className="text-emerald-500"> • concluídos {specializedCompleted}</span>
        <span className="text-amber-500"> • timeout {specializedTimeout}</span>
        <span className="text-destructive"> • erro {specializedError}</span>
      </div>
      <ReportToc entries={parseSectionsForToc(reportMarkdown)} />
      <ReportAccordion markdown={reportMarkdown} />

      {structuredAnalyses.length > 0 && (
        <div className="space-y-4 pt-2">
          {structuredAnalyses.map((item) => {
            const Component = getStructuredComponent(item.agentName)
            return (
              <div key={item.agentName} className="rounded-lg border bg-card px-4 py-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">{item.agentName}</h3>
                  <p className="text-xs text-muted-foreground">{item.specialty}</p>
                </div>
                <Component data={item.data} />
                <p className="text-xs text-muted-foreground italic border-t pt-2">
                  Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional.
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
