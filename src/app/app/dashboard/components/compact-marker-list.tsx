import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'
import { cn } from '@/lib/utils'

interface Marker {
  name: string
  value: string | number
  unit?: string
  status: string
}

function getIndicator(status: string): { symbol: string; className: string } {
  if (status === 'high' || status === 'abnormal') {
    return { symbol: '↑', className: 'text-destructive' }
  }
  if (status === 'low') {
    return { symbol: '↓', className: 'text-blue-500' }
  }
  return { symbol: '⚠', className: 'text-yellow-500' }
}

function extractAlteredMarkers(doc: SanitizedMedicalDocument): Marker[] {
  const markers: Marker[] = []
  for (const module of doc.modules) {
    for (const param of module.parameters) {
      const s = param.status ?? module.status
      if (s !== 'normal' && s !== 'n/a') {
        markers.push({
          name: param.name,
          value: param.value,
          unit: param.unit,
          status: s,
        })
      }
    }
  }
  return markers.slice(0, 8)
}

interface CompactMarkerListProps {
  structuredData: SanitizedMedicalDocument
}

export function CompactMarkerList({ structuredData }: CompactMarkerListProps) {
  const markers = extractAlteredMarkers(structuredData)

  if (markers.length === 0) return null

  return (
    <div className="rounded-lg border border-foreground/10 bg-card px-3 py-2 space-y-0.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
        Marcadores alterados
      </p>
      {markers.map((marker, i) => {
        const { symbol, className } = getIndicator(marker.status)
        return (
          <div
            key={`${marker.name}-${i}`}
            className="flex items-center justify-between gap-2 py-0.5"
          >
            <span
              className={cn('text-base font-bold leading-none shrink-0 w-4 text-center', className)}
              aria-hidden="true"
            >
              {symbol}
            </span>
            <span className="flex-1 truncate text-sm text-foreground">{marker.name}</span>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {marker.value}
              {marker.unit ? ` ${marker.unit}` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
