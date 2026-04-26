import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { documents, snapshots } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { Skeleton } from '@/components/ui/skeleton'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  normal:     { label: '✓ Normal',    color: 'text-[#22c55e]' },
  high:       { label: '↑ Alto',      color: 'text-destructive' },
  low:        { label: '↓ Baixo',     color: 'text-blue-500' },
  abnormal:   { label: '✕ Alterado',  color: 'text-destructive' },
  borderline: { label: '~ Limítrofe', color: 'text-amber-500' },
  'n/a':      { label: 'N/D',         color: 'text-muted-foreground' },
}

const MODULE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  normal:     { bg: 'bg-[#d1fae5] dark:bg-[#d1fae5]/20', text: 'text-[#065f46] dark:text-[#34d399]', label: 'Normal' },
  high:       { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Alterado' },
  low:        { bg: 'bg-blue-500/10',    text: 'text-blue-500',    label: 'Baixo' },
  abnormal:   { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Alterado' },
  borderline: { bg: 'bg-amber-500/10',   text: 'text-amber-500',   label: 'Limítrofe' },
  'n/a':      { bg: 'bg-muted',          text: 'text-muted-foreground', label: 'N/D' },
}

function ParameterRow({
  name,
  value,
  unit,
  referenceRange,
  status,
  last,
}: {
  name: string
  value: string | number
  unit?: string
  referenceRange?: string
  status?: string
  last?: boolean
}) {
  const cfg = status ? STATUS_CONFIG[status] : null

  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-4 py-[10px] ${last ? '' : 'border-b border-border'}`}
    >
      <span className="text-[13px] font-medium text-foreground">{name}</span>
      <span className="font-heading text-[13px] font-medium text-foreground tabular-nums">
        {value}{unit ? ` ${unit}` : ''}
      </span>
      <span className="text-[12px] font-medium text-muted-foreground">
        {referenceRange ?? '—'}
      </span>
      {cfg ? (
        <span className={`text-[12px] font-medium ${cfg.color}`}>{cfg.label}</span>
      ) : (
        <span className="text-[12px] text-muted-foreground">—</span>
      )}
    </div>
  )
}

function ModuleSection({ module }: { module: SanitizedMedicalDocument['modules'][number] }) {
  const badge = MODULE_BADGE[module.status] ?? MODULE_BADGE['n/a']

  return (
    <section className="rounded-[12px] border border-border bg-card overflow-hidden">
      {/* module header */}
      <div className="flex items-center justify-between gap-3 bg-muted/40 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="font-heading text-[14px] font-medium leading-[1.4286] text-foreground">
            {module.moduleName}
          </p>
          <p className="text-[11px] font-medium text-muted-foreground">{module.category}</p>
        </div>
        <span className={`rounded-[12px] px-[10px] py-[3px] text-[11px] font-medium shrink-0 ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {module.parameters.length > 0 && (
        <>
          {/* col headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-border px-4 py-2">
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">PARÂMETRO</span>
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">VALOR</span>
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">REFERÊNCIA</span>
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">STATUS</span>
          </div>
          {module.parameters.map((p, i) => (
            <ParameterRow
              key={`${p.name}-${i}`}
              name={p.name}
              value={p.value}
              unit={p.unit}
              referenceRange={p.referenceRange}
              status={p.status}
              last={i === module.parameters.length - 1}
            />
          ))}
        </>
      )}
    </section>
  )
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const { id } = await params

  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<DocumentSkeleton />}>
        <DocumentContent id={id} userId={session.user.id} />
      </Suspense>
    </main>
  )
}

async function DocumentContent({ id, userId }: { id: string; userId: string }) {
  const [row] = await db
    .select({
      docId: documents.id,
      documentType: documents.documentType,
      originalFileName: documents.originalFileName,
      examDate: documents.examDate,
      createdAt: documents.createdAt,
      overallSummary: documents.overallSummary,
      structuredData: snapshots.structuredData,
    })
    .from(documents)
    .leftJoin(snapshots, eq(snapshots.documentId, documents.id))
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1)

  if (!row) notFound()

  const data = row.structuredData
  const examDate = row.examDate
    ? new Date(`${row.examDate}T00:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : row.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const totalParams = data?.modules.reduce((sum, m) => sum + m.parameters.length, 0) ?? 0
  const alteredParams =
    data?.modules.reduce(
      (sum, m) =>
        sum + m.parameters.filter((p) => p.status && p.status !== 'normal' && p.status !== 'n/a').length,
      0,
    ) ?? 0

  return (
    <div className="flex flex-col gap-4 px-4 pt-12 pb-20">
      {/* back */}
      <Link
        href="/app/history"
        className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Histórico
      </Link>

      {/* header card */}
      <div className="rounded-[16px] border border-border bg-card flex flex-col gap-3 p-4">
        <p className="font-heading text-[18px] font-medium leading-[1.4286] text-foreground truncate">
          {row.originalFileName}
        </p>
        <p className="text-[13px] font-medium text-muted-foreground">
          {row.documentType} • {examDate}
        </p>

        {(totalParams > 0 || alteredParams > 0) && (
          <div className="flex items-center gap-2 flex-wrap">
            {totalParams > 0 && (
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium text-foreground">
                {totalParams} parâmetros
              </span>
            )}
            {alteredParams > 0 && (
              <span className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive">
                {alteredParams} alterados
              </span>
            )}
          </div>
        )}

        {row.overallSummary && (
          <>
            <div className="h-px bg-border" />
            <p className="text-[13px] font-medium text-muted-foreground">{row.overallSummary}</p>
          </>
        )}
      </div>

      {/* modules */}
      {!data ? (
        <div className="rounded-[12px] border border-border bg-card p-8 text-center">
          <p className="text-[13px] font-medium text-muted-foreground">
            Os dados estruturados deste exame ainda não estão disponíveis.
          </p>
        </div>
      ) : (

        <div className="flex flex-col gap-4">
          {data.modules.map((module, i) => (
            <ModuleSection key={`${module.moduleName}-${i}`} module={module} />
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-12 pb-20">
      <Skeleton className="h-4 w-24" />
      <div className="rounded-[16px] border border-border bg-card p-4 flex flex-col gap-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-[12px]" />
        ))}
      </div>
    </div>
  )
}
