'use client'

const MAX_RENDER_DEPTH = 8

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) return null
  if (depth >= MAX_RENDER_DEPTH) return <span className="text-sm text-muted-foreground">[…]</span>

  if (Array.isArray(value)) {
    if (value.length === 0) return null
    const firstItem = value[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      return (
        <ul className="space-y-2">
          {value.map((item, i) => (
            <li key={i} className="rounded-md border bg-muted/30 px-3 py-2">
              {renderValue(item, depth + 1)}
            </li>
          ))}
        </ul>
      )
    }
    return (
      <ul className="space-y-0.5">
        {value.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 shrink-0">•</span>
            <span>{String(item)}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== undefined && v !== '',
    )
    if (entries.length === 0) return null
    return (
      <dl className="space-y-2">
        {entries.map(([key, val]) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
          return (
            <div key={key}>
              <dt className="text-xs font-semibold text-muted-foreground mb-0.5">{label}</dt>
              <dd className="text-sm">{renderValue(val, depth + 1)}</dd>
            </div>
          )
        })}
      </dl>
    )
  }

  return <span className="text-sm">{String(value)}</span>
}

export function GenericStructuredView({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null

  if (typeof data !== 'object' || Array.isArray(data)) {
    return <p className="text-sm text-muted-foreground">{String(data)}</p>
  }

  const entries = Object.entries(data as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  )

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => {
        const heading = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
        return (
          <section key={key}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              {heading}
            </h4>
            {renderValue(value)}
          </section>
        )
      })}
    </div>
  )
}
