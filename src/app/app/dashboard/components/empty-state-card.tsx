import Link from 'next/link'
import { FileX, FlaskConical, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

type EmptyStateVariant = 'no-exam' | 'no-analysis' | 'processing'

interface EmptyStateCardProps {
  variant: EmptyStateVariant
  documentId?: string
}

export function EmptyStateCard({ variant, documentId }: EmptyStateCardProps) {
  if (variant === 'no-exam') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <FileX className="size-10 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Nenhum exame encontrado</p>
            <p className="text-sm text-muted-foreground">
              Envie seu primeiro exame para começar sua análise de saúde.
            </p>
          </div>
          <Link href="/app/upload" className={cn(buttonVariants(), 'min-h-[44px] w-full')}>
            Enviar exame
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'processing') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Preparando sua análise...</p>
            <p className="text-sm text-muted-foreground">
              Seus dados estão sendo processados. Isso pode levar alguns instantes.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <FlaskConical className="size-10 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Análise não iniciada</p>
          <p className="text-sm text-muted-foreground">
            Seu exame foi processado. Inicie a análise para ver seus indicadores.
          </p>
        </div>
        <Link
          href={documentId ? `/app/analyses/run?documentId=${encodeURIComponent(documentId)}` : '/app/upload'}
          className={cn(buttonVariants(), 'min-h-[44px] w-full')}
        >
          Analisar
        </Link>
      </CardContent>
    </Card>
  )
}
