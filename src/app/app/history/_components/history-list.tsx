'use client'

import Link from 'next/link'
import type {
  AnalysisHistoryItem,
  DocumentCategory,
  DocumentWithHistory,
} from '@/lib/db/queries/history'

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  bioimpedance: 'Bioimpedância',
  blood_test: 'Sangue',
  other: 'Outro',
}

const CATEGORY_PILL: Record<DocumentCategory, string> = {
  blood_test: 'bg-[#fde68a] text-[#92400e]',
  bioimpedance: 'bg-[#ede9fe] text-[#5b21b6]',
  other: 'bg-muted text-muted-foreground',
}

type Props = {
  documents: DocumentWithHistory[]
  analyses: AnalysisHistoryItem[]
}

export function HistoryList({ documents, analyses }: Props) {
  if (documents.length === 0 && analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-[13px] font-medium text-muted-foreground">
          Nenhum exame ou análise encontrado
        </p>
        <Link
          href="/app/upload"
          className="h-12 rounded-xl bg-primary px-6 font-heading text-[15px] font-semibold text-primary-foreground flex items-center justify-center"
        >
          Enviar primeiro exame
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-heading text-[13px] font-semibold leading-[1.4286] text-foreground">
              Exames
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              {documents.length} total
            </p>
          </div>
          {documents.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </section>
      )}

      {analyses.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-heading text-[13px] font-semibold leading-[1.4286] text-foreground">
              Análises
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              {analyses.length} total
            </p>
          </div>
          {analyses.map((a) => (
            <AnalysisCard key={a.id} analysis={a} />
          ))}
        </section>
      )}
    </div>
  )
}

function DocCard({ doc }: { doc: DocumentWithHistory }) {
  const dateLabel = (() => {
    if (doc.examDate) {
      const [year, month, day] = doc.examDate.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
    return doc.createdAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  })()

  const category = doc.category ?? 'other'
  const categoryLabel = CATEGORY_LABEL[category]
  const categoryPill = CATEGORY_PILL[category]

  const statusPill = doc.processingStatus === 'completed'
    ? 'bg-[#d1fae5] text-[#065f46]'
    : doc.processingStatus === 'pending'
      ? 'bg-[#fde68a] text-[#92400e]'
      : 'bg-muted text-muted-foreground'
  const statusLabel = doc.processingStatus === 'completed'
    ? 'Processado'
    : doc.processingStatus === 'pending'
      ? 'Pendente'
      : 'Erro'

  return (
    <Link
      href={`/app/documents/${doc.id}`}
      className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-3.5 py-3 hover:bg-muted/30 transition-colors"
    >
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <p className="font-heading text-[13px] font-medium leading-[1.4286] text-foreground truncate">
          {doc.originalFileName ?? doc.documentType}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryPill}`}>
            {categoryLabel}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusPill}`}>
            {statusLabel}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">{dateLabel}</span>
        </div>
      </div>
      <span className="text-[14px] font-medium text-primary shrink-0">→</span>
    </Link>
  )
}

function AnalysisCard({ analysis }: { analysis: AnalysisHistoryItem }) {
  const dateLabel = analysis.createdAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const statusPill = analysis.status === 'completed'
    ? 'bg-[#d1fae5] text-[#065f46]'
    : analysis.status === 'processing'
      ? 'bg-[#fde68a] text-[#92400e]'
      : 'bg-muted text-muted-foreground'
  const statusLabel = analysis.status === 'completed'
    ? 'Concluída'
    : analysis.status === 'processing'
      ? 'Em andamento'
      : 'Falhou'

  const href = analysis.status === 'completed'
    ? `/app/analyses/${analysis.livingAnalysisId}`
    : `/app/analyses/${analysis.livingAnalysisId}`

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-3.5 py-3 hover:bg-muted/30 transition-colors"
    >
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <p className="font-heading text-[13px] font-medium leading-[1.4286] text-foreground truncate">
          Análise Completa{analysis.version > 1 ? ` v${analysis.version}` : ''}
          {analysis.triggerDocumentExamDate
            ? ` — ${new Date(`${analysis.triggerDocumentExamDate}T00:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
            : ''}
        </p>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusPill}`}>
            {statusLabel}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">{dateLabel}</span>
        </div>
      </div>
      <span className="text-[14px] font-medium text-primary shrink-0">→</span>
    </Link>
  )
}
