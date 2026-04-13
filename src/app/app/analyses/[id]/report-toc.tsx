'use client'

interface TocEntry {
  id: string
  title: string
}

interface ReportTocProps {
  entries: TocEntry[]
}

export function ReportToc({ entries }: ReportTocProps) {
  if (entries.length < 2) return null

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav aria-label="Sumário do relatório" className="rounded-lg border bg-card px-4 py-3">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Sumário
      </p>
      <ol className="space-y-1">
        {entries.map((entry, i) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={(e) => handleClick(e, entry.id)}
              className="flex items-baseline gap-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
            >
              <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums w-4">
                {i + 1}.
              </span>
              <span className="truncate">{entry.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
