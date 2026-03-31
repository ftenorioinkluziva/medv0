import { Card, CardContent } from '@/components/ui/card'

type MarkerStatus = 'high' | 'low' | 'abnormal' | 'borderline' | 'normal' | 'n/a' | string

interface AlteredMarkerCardProps {
  name: string
  value: string | number
  unit?: string
  status: MarkerStatus
}

function getIndicator(status: MarkerStatus): { symbol: string; className: string } {
  if (status === 'high' || status === 'abnormal') {
    return { symbol: '↑', className: 'text-destructive' }
  }
  if (status === 'low') {
    return { symbol: '↓', className: 'text-blue-400' }
  }
  return { symbol: '⚠', className: 'text-yellow-500' }
}

export function AlteredMarkerCard({ name, value, unit, status }: AlteredMarkerCardProps) {
  const { symbol, className } = getIndicator(status)

  return (
    <Card size="sm">
      <CardContent className="flex min-h-[44px] items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">{name}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-sm text-muted-foreground">
            {value}
            {unit ? ` ${unit}` : ''}
          </span>
          <span className={`text-base font-bold ${className}`} aria-label={`status: ${status}`}>
            {symbol}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
