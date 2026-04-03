import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { documents, snapshots } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { ArrowLeft, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  normal:     { label: 'Normal',     className: 'text-green-500' },
  high:       { label: 'Alto',       className: 'text-red-500' },
  low:        { label: 'Baixo',      className: 'text-blue-500' },
  abnormal:   { label: 'Alterado',   className: 'text-red-500' },
  borderline: { label: 'Limítrofe', className: 'text-yellow-500' },
  'n/a':      { label: 'N/D',       className: 'text-muted-foreground' },
}

const MODULE_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  normal:     'default',
  high:       'destructive',
  low:        'warning',
  abnormal:   'destructive',
  borderline: 'warning',
  'n/a':      'secondary',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'normal') return <CheckCircle2 className="size-3.5 text-green-500" />
  if (status === 'n/a') return <Minus className="size-3.5 text-muted-foreground" />
  if (status === 'low') return <TrendingDown className="size-3.5 text-blue-500" />
  if (status === 'high' || status === 'abnormal') return <TrendingUp className="size-3.5 text-red-500" />
  return <AlertCircle className="size-3.5 text-yellow-500" />
}

function ParameterRow({
  name,
  value,
  unit,
  referenceRange,
  status,
}: {
  name: string
  value: string | number
  unit?: string
  referenceRange?: string
  status?: string
}) {
  const cfg = status ? STATUS_CONFIG[status] : null

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 gap-y-0 border-b border-foreground/6 py-2.5 last:border-0">
      <span className="text-sm text-foreground">{name}</span>
      <span className="text-sm font-medium text-foreground tabular-nums">
        {value}{unit ? ` ${unit}` : ''}
      </span>
      <span className="text-xs text-muted-foreground">
        {referenceRange ?? '—'}
      </span>
      {cfg ? (
        <span className={cn('flex items-center gap-1 text-xs font-medium', cfg.className)}>
          {status && <StatusIcon status={status} />}
          {cfg.label}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  )
}

function ModuleSection({ module }: { module: SanitizedMedicalDocument['modules'][number] }) {
  const variant = MODULE_STATUS_VARIANT[module.status] ?? 'secondary'

  return (
    <section className="rounded-xl border border-foreground/10 bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-foreground/8 bg-foreground/[0.02] px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{module.moduleName}</p>
          <p className="text-xs text-muted-foreground">{module.category}</p>
        </div>
        <Badge variant={variant} className="shrink-0 text-xs">
          {STATUS_CONFIG[module.status]?.label ?? module.status}
        </Badge>
      </div>

      {module.summary && (
        <p className="px-4 py-3 text-sm text-muted-foreground border-b border-foreground/6">
          {module.summary}
        </p>
      )}

      {module.parameters.length > 0 && (
        <div className="px-4">
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-foreground/8 py-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Parâmetro</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Valor</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Referência</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Status</span>
          </div>
          {module.parameters.map((p, i) => (
            <ParameterRow
              key={`${p.name}-${i}`}
              name={p.name}
              value={p.value}
              unit={p.unit}
              referenceRange={p.referenceRange}
              status={p.status}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const { id } = await params

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
    .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
    .limit(1)

  if (!row) notFound()

  const data = row.structuredData
  const examDate = row.examDate
    ? new Date(row.examDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : row.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const totalParams = data?.modules.reduce((sum, m) => sum + m.parameters.length, 0) ?? 0
  const alteredParams = data?.modules.reduce(
    (sum, m) => sum + m.parameters.filter((p) => p.status && p.status !== 'normal' && p.status !== 'n/a').length,
    0,
  ) ?? 0

  return (
    <main className="min-h-screen bg-background">
      <div className="space-y-5 p-4 md:p-6">
        {/* Header */}
        <div className="space-y-3">
          <Link
            href="/app/history"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Histórico
          </Link>

          <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm space-y-3">
            <div>
              <h1 className="text-xl font-bold text-foreground truncate" title={row.originalFileName}>
                {row.originalFileName}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {row.documentType} • {examDate}
              </p>
            </div>

            {(totalParams > 0 || alteredParams > 0) && (
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-xs font-medium text-foreground">
                  {totalParams} parâmetros
                </span>
                {alteredParams > 0 && (
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500">
                    {alteredParams} alterados
                  </span>
                )}
              </div>
            )}

            {row.overallSummary && (
              <p className="text-sm text-muted-foreground border-t border-foreground/8 pt-3">
                {row.overallSummary}
              </p>
            )}
          </div>
        </div>

        {/* Módulos */}
        {!data ? (
          <div className="rounded-xl border border-foreground/10 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Os dados estruturados deste exame ainda não estão disponíveis.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.modules.map((module, i) => (
              <ModuleSection key={`${module.moduleName}-${i}`} module={module} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
