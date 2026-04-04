'use client'

import { MessageResponse } from '@/components/ai-elements/message'

interface ReportViewProps {
  reportMarkdown: string
  version: number
  createdAt: Date
}

export function ReportView({ reportMarkdown, version, createdAt }: ReportViewProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Versão {version}</span>
        <span>{formattedDate}</span>
      </div>
      <div className="rounded-lg border bg-card px-6 py-5">
        <MessageResponse content={reportMarkdown} />
      </div>
    </div>
  )
}
