import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnalysisCardProps {
  analysisId: string
  examDate: string | null
  documentType: string
  analysisCreatedAt: Date
  analysisStatus: string
}

export function AnalysisCard({
  analysisId,
  examDate,
  documentType,
  analysisCreatedAt,
  analysisStatus,
}: AnalysisCardProps) {
  const relativeDate = formatDistanceToNow(analysisCreatedAt, {
    addSuffix: true,
    locale: ptBR,
  })

  const isProcessing = analysisStatus === 'processing'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Última Análise</CardTitle>
          {isProcessing ? (
            <Badge variant="warning" className="flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              Em andamento...
            </Badge>
          ) : (
            <Badge variant="success">Concluída</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="space-y-1 text-sm">
          {examDate && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Data do exame</dt>
              <dd className="font-medium">{examDate}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Tipo</dt>
            <dd className="max-w-[60%] truncate text-right font-medium">{documentType}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Análise</dt>
            <dd className="font-medium">{relativeDate}</dd>
          </div>
        </dl>

        {!isProcessing && (
          <Link
            href={`/app/analyses/${analysisId}`}
            className={cn(buttonVariants({ size: 'sm' }), 'w-full min-h-[44px]')}
          >
            Ver relatório
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
