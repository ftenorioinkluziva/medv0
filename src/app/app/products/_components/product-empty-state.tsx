import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export function ProductEmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-muted-foreground text-sm">
        Nenhum {label} gerado ainda.
      </p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Envie um exame e execute uma análise completa para gerar seus produtos de saúde.
      </p>
      <Link href="/app/upload" className={buttonVariants()}>
        Enviar exame
      </Link>
    </div>
  )
}
