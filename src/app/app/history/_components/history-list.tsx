'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ExamCard } from './exam-card'
import type { DocumentWithHistory } from '@/lib/db/queries/history'
import type { ParameterEvolution } from '@/lib/history/evolution'

type Props = {
  documents: DocumentWithHistory[]
  evolutionMap: Record<string, ParameterEvolution[]>
}

export function HistoryList({ documents, evolutionMap }: Props) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground text-sm">Nenhum exame encontrado</p>
        <Link href="/app/upload" className={cn(buttonVariants(), 'min-h-11')}>
          Enviar primeiro exame
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.map((doc) => (
        <ExamCard key={doc.id} doc={doc} evolution={evolutionMap[doc.id] ?? []} />
      ))}
    </div>
  )
}
