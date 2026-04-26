'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getStructuredComponent } from '@/components/structured-outputs/registry'

interface AgentReportViewProps {
  analysisId: string
  agentName: string
  specialty: string
  content: string
  outputType: string
  analysisRole: string
  createdAt: Date
}

function AgentMarkdown({ content }: { content: string }) {
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

export function AgentReportView({
  analysisId,
  agentName,
  specialty,
  content,
  outputType,
  createdAt,
}: AgentReportViewProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const StructuredComponent = outputType === 'structured' ? getStructuredComponent(agentName) : null
  const structuredData = StructuredComponent
    ? (() => { try { return JSON.parse(content) } catch { return null } })()
    : null

  return (
    <div className="flex flex-col gap-3">
      {/* header */}
      <div className="flex h-14 items-center justify-between">
        <Link
          href={`/app/analyses/${analysisId}`}
          className="font-heading text-[15px] font-semibold leading-[1.4286] text-foreground hover:opacity-80"
        >
          ← Análise Completa
        </Link>
        <span className="text-[11px] font-medium text-muted-foreground">{formattedDate}</span>
      </div>

      {/* agent identity card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex h-13 items-center px-5">
          <p className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
            🤖 {agentName}
          </p>
        </div>
        <div className="px-5 pb-4">
          <p className="text-[13px] font-medium text-muted-foreground">{specialty}</p>
        </div>
      </div>

      {/* analysis content card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex h-13 items-center px-5">
          <p className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
            📋 Análise
          </p>
        </div>
        <div className="px-5 pb-4">
          {StructuredComponent && structuredData ? (
            <StructuredComponent data={structuredData} />
          ) : (
            <AgentMarkdown content={content} />
          )}
        </div>
      </div>

      {/* disclaimer */}
      <p className="text-[11px] text-muted-foreground text-center px-2 pb-2">
        Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional.
      </p>
    </div>
  )
}
