'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function buildHref(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  const prevDisabled = currentPage <= 1
  const nextDisabled = currentPage >= totalPages

  const navLinkClass = cn(
    'inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-medium transition-colors',
    'hover:bg-muted hover:text-foreground',
    'disabled:pointer-events-none disabled:opacity-50',
  )

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">
        Página {currentPage} de {totalPages}
      </p>
      <div className="flex gap-2">
        {prevDisabled ? (
          <span className={cn(navLinkClass, 'opacity-50 pointer-events-none')}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </span>
        ) : (
          <Link href={buildHref(currentPage - 1)} className={navLinkClass}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Link>
        )}
        {nextDisabled ? (
          <span className={cn(navLinkClass, 'opacity-50 pointer-events-none')}>
            Próximo
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link href={buildHref(currentPage + 1)} className={navLinkClass}>
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  )
}
