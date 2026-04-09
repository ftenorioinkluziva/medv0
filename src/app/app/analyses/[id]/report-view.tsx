'use client'

import { MessageResponse } from '@/components/ai-elements/message'

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
      <div className="rounded-lg border bg-card px-6 py-5">
        <MessageResponse content={reportMarkdown} />
      </div>
    </div>
  )
}
