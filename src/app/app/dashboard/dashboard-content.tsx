'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Upload, ArrowRight, Loader2, LogOut,
  User, FileText, Activity, ShoppingBag, Pill, UtensilsCrossed, Dumbbell,
  ChevronRight,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { DashboardData, BodyCompositionSummary, ProductSummaryItem } from './page'
import type { DashboardProfile, DashboardDocument, DashboardAnalysis } from '@/lib/db/queries/dashboard'

// ─── helpers ────────────────────────────────────────────────────────────────

const displayName = (name: string | null | undefined): string => {
  const raw = name?.trim()
  if (!raw) return 'você'
  const token = raw.includes('@') ? raw.split('@')[0] : raw.split(' ')[0]
  return token.length > 18 ? `${token.slice(0, 17)}…` : token
}

function calcBmi(weight: string, height: number): number | null {
  const w = parseFloat(weight)
  const h = height / 100
  if (!w || !h) return null
  return w / (h * h)
}

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'Abaixo do peso'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Sobrepeso'
  return 'Obesidade'
}

function bmiColor(bmi: number): string {
  if (bmi < 18.5) return 'text-blue-500'
  if (bmi < 25) return 'text-green-500'
  if (bmi < 30) return 'text-amber-500'
  return 'text-red-500'
}

function truncateWords(text: string, maxWords: number): { truncated: string; wasTruncated: boolean } {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return { truncated: text, wasTruncated: false }
  // walk back to last sentence boundary
  let end = maxWords
  while (end > maxWords - 20 && !/[.!?]/.test(words[end - 1] ?? '')) end--
  return { truncated: words.slice(0, end).join(' '), wasTruncated: true }
}

function extractSummarySection(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n').trim()
  if (!normalized) return ''

  const summaryHeadingRegex = /^##\s*(?:📋\s*)?(?:Resumo(?: Executivo)?)(?:\s*:)?\s*$/im
  const match = summaryHeadingRegex.exec(normalized)
  if (!match || match.index == null) return ''

  const sectionStart = match.index + match[0].length
  const sectionBody = normalized.slice(sectionStart).trimStart()
  const nextHeadingMatch = /^##\s+/m.exec(sectionBody)
  const rawSummary = nextHeadingMatch
    ? sectionBody.slice(0, nextHeadingMatch.index)
    : sectionBody

  return rawSummary.trim()
}

const CATEGORY_LABELS: Record<string, string> = {
  bioimpedance: 'Bioimpedância',
  blood_test: 'Exames de Sangue',
  other: 'Outros',
}

const CATEGORY_COLORS: Record<string, string> = {
  bioimpedance: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  blood_test: 'bg-red-500/10 text-red-600 dark:text-red-400',
  other: 'bg-muted text-muted-foreground',
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Feminino',
  other: 'Outro',
  nonbinary: 'Não-binário',
  none: 'Não informado',
}

const DOC_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Processado',
  failed: 'Falhou',
}

const DOC_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:text-amber-300',
  processing: 'bg-sky-100 text-sky-700 dark:text-sky-300',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-rose-100 text-rose-700 dark:text-rose-300',
  default: 'bg-muted text-muted-foreground',
}

function genderLabel(gender: string | null | undefined): string {
  if (!gender) return 'Não informado'
  return GENDER_LABELS[gender.toLowerCase()] ?? gender
}

function formatDelta(delta: string | null): string | null {
  if (!delta) return null
  return delta === 'estável' ? 'Estável vs último registro' : `${delta} vs último registro`
}

function getStatusLabel(status: string): string {
  return DOC_STATUS_LABELS[status] ?? status
}

function getStatusColor(status: string): string {
  return DOC_STATUS_COLORS[status] ?? DOC_STATUS_COLORS.default
}

// ─── Section 1: Perfil Básico ────────────────────────────────────────────────

function ProfileCard({
  profile,
  bodyComposition,
  userName,
}: {
  profile: DashboardProfile | null
  bodyComposition: BodyCompositionSummary | null
  userName: string
}) {
  const bmi = profile ? calcBmi(profile.weight, profile.height) : null
  const weight = bodyComposition?.weight ?? profile?.weight ?? null
  const bodyFat = bodyComposition?.bodyFat ?? profile?.bodyFatPercentage ?? null
  const muscleMass = bodyComposition?.muscleMass ?? profile?.muscleMass ?? null
  const weightDelta = formatDelta(bodyComposition?.weightDelta ?? null)
  const bodyFatDelta = formatDelta(bodyComposition?.bodyFatDelta ?? null)
  const muscleMassDelta = formatDelta(bodyComposition?.muscleMassDelta ?? null)

  return (
    <section aria-labelledby="profile-heading" data-testid="profile-card">
      <div className="rounded-2xl border border-foreground/10 bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="profile-heading" className="font-semibold text-foreground">
                {displayName(userName)}
              </h2>
            </div>
            {profile && (
              <p className="mt-1 text-sm text-muted-foreground">
                {profile.age} anos • {genderLabel(profile.gender)}
              </p>
            )}
          </div>
          <Link
            href="/app/profile"
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
          >
            Atualizar perfil <ChevronRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        {!profile ? (
          <p className="text-sm text-muted-foreground py-2">
            Complete seu perfil para ver seus dados de saúde aqui.
          </p>
        ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Altura</p>
                <p className="text-sm font-semibold">{profile.height} cm</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Peso</p>
                <p className="text-sm font-semibold">{weight ? `${parseFloat(weight).toFixed(1)} kg` : '—'}</p>
                {weightDelta && <p className="text-[10px] text-muted-foreground">{weightDelta}</p>}
              </div>

              {bodyFat && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">% Gordura</p>
                  <p className="text-sm font-semibold">{parseFloat(bodyFat).toFixed(1)}%</p>
                  {bodyFatDelta && <p className="text-[10px] text-muted-foreground">{bodyFatDelta}</p>}
                </div>
              )}

              {muscleMass && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Massa Magra</p>
                  <p className="text-sm font-semibold">{parseFloat(muscleMass).toFixed(1)} kg</p>
                  {muscleMassDelta && <p className="text-[10px] text-muted-foreground">{muscleMassDelta}</p>}
                </div>
              )}

            {bmi && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">IMC</p>
                <p className={cn('text-sm font-semibold', bmiColor(bmi))}>{bmi.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">{bmiLabel(bmi)}</p>
              </div>
            )}

            {profile.inbodyScore != null && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">InBody Score</p>
                <p className="text-sm font-semibold text-primary">{profile.inbodyScore}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Section 2: Últimos Documentos ──────────────────────────────────────────

function RecentDocsCard({
  docs,
}: {
  docs: DashboardDocument[]
}) {
  return (
    <section aria-labelledby="docs-heading" data-testid="recent-docs-card">
      <div className="rounded-2xl border border-foreground/10 bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="docs-heading" className="font-semibold text-foreground">Últimos Documentos</h2>
          </div>
          <Link
            href="/app/history"
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
          >
            Ver histórico <ChevronRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
            <Link
              href="/app/upload"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="size-4" aria-hidden="true" />
              Enviar primeiro documento
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {docs.map((doc) => {
              const date = doc.examDate
                ? new Date(doc.examDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                : doc.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

              const catKey = doc.category ?? 'other'
              const catLabel = CATEGORY_LABELS[catKey] ?? catKey
              const catColor = CATEGORY_COLORS[catKey] ?? CATEGORY_COLORS.other

              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium" title={doc.originalFileName}>
                      {doc.originalFileName}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', catColor)}>
                        {catLabel}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', getStatusColor(doc.processingStatus))}>
                        {getStatusLabel(doc.processingStatus)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{date}</span>
                    </div>
                  </div>
                  <Link
                    href={`/app/documents/${doc.id}`}
                    className="shrink-0 text-[11px] font-medium text-primary hover:underline"
                  >
                    Ver exame
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Section 3: Resumo de Saúde ─────────────────────────────────────────────

function HealthSummaryCard({ analysis }: { analysis: DashboardAnalysis | null }) {
  if (!analysis || !analysis.reportMarkdown?.trim()) {
    return (
      <section aria-labelledby="summary-heading" data-testid="health-summary-card">
        <div className="rounded-2xl border border-foreground/10 bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="summary-heading" className="font-semibold text-foreground">Estado de Saúde</h2>
          </div>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma análise disponível ainda.</p>
            <Link
              href="/app/upload"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="size-4" aria-hidden="true" />
              Enviar primeiro documento
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const summarySection = extractSummarySection(analysis.reportMarkdown)
  const summaryText = summarySection || 'Resumo não identificado na análise completa mais recente.'
  const { truncated } = truncateWords(summaryText, 220)

  const updatedDate = analysis.updatedAt.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <section aria-labelledby="summary-heading" data-testid="health-summary-card">
      <div className="rounded-2xl border border-foreground/10 bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="summary-heading" className="font-semibold text-foreground">Estado de Saúde</h2>
          </div>
          <span className="text-[10px] text-muted-foreground">{updatedDate}</span>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line line-clamp-[10]">
          {truncated}
        </p>

        <Link
          href={`/app/analyses/${analysis.id}`}
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
        >
          Ver última análise <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

// ─── Products Card ───────────────────────────────────────────────────────────

const PRODUCT_ITEMS = [
  { type: 'supplementation', label: 'Suplementação', Icon: Pill, href: '/app/products/supplementation', color: 'text-violet-500' },
  { type: 'meals', label: 'Plano Alimentar', Icon: UtensilsCrossed, href: '/app/products/meals', color: 'text-emerald-500' },
  { type: 'workout', label: 'Treino', Icon: Dumbbell, href: '/app/products/workout', color: 'text-blue-500' },
] as const

function ProductsCard({ products }: { products: ProductSummaryItem[] }) {
  if (products.length === 0) return null

  const map = Object.fromEntries(products.map((p) => [p.productType, p]))

  return (
    <section aria-labelledby="products-heading">
      <div className="rounded-2xl border border-foreground/10 bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="products-heading" className="font-semibold text-foreground">Meus Produtos</h2>
          </div>
          <Link
            href="/app/products"
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
          >
            Ver todos <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PRODUCT_ITEMS.map(({ type, label, Icon, href, color }) => {
            const product = map[type]
            return (
              <Link
                key={type}
                href={product ? href : '/app/products'}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-center transition-colors',
                  product ? 'hover:bg-muted/50' : 'opacity-50 pointer-events-none',
                )}
                aria-disabled={!product}
                tabIndex={product ? 0 : -1}
              >
                <Icon className={cn('size-5', product ? color : 'text-muted-foreground')} aria-hidden="true" />
                <span className="text-[11px] font-medium leading-tight">{label}</span>
                {product && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(product.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Root ────────────────────────────────────────────────────────────────────

interface DashboardContentProps {
  data: DashboardData
}

export function DashboardContent({ data }: DashboardContentProps) {
  const router = useRouter()
  const {
    userName,
    profile,
    recentDocs,
    livingAnalysis,
    historyEntries,
    latestDocumentId,
    bodyComposition,
    productsSummary,
  } = data

  const legacyLivingAnalysis = historyEntries[0]?.doc.livingAnalysis ?? null
  const analysisIsCurrentForLatestDocument =
    legacyLivingAnalysis?.currentTriggerDocumentId != null &&
    latestDocumentId != null &&
    legacyLivingAnalysis.currentTriggerDocumentId === latestDocumentId
  const needsAnalysisUpdate =
    historyEntries.length > 0 && latestDocumentId != null && !analysisIsCurrentForLatestDocument
  const [triggering, setTriggering] = useState(false)
  const autoTriggerAttemptedRef = useRef(false)

  async function handleTriggerAnalysis() {
    if (!latestDocumentId) return
    setTriggering(true)
    try {
      const resp = await fetch('/api/analyses/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: latestDocumentId }),
      })
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.error ?? 'Erro ao iniciar análise.')
      }
      toast.success('Análise iniciada! Aguarde alguns instantes.')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setTriggering(false)
    }
  }

  useEffect(() => {
    if (!needsAnalysisUpdate || !latestDocumentId) return
    if (legacyLivingAnalysis?.status === 'processing') return
    if (autoTriggerAttemptedRef.current) return
    autoTriggerAttemptedRef.current = true
    void handleTriggerAnalysis()
  }, [latestDocumentId, legacyLivingAnalysis?.status, needsAnalysisUpdate])

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Olá, {displayName(userName)}</h1>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          aria-label="Sair"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-foreground/15 bg-background/60 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* E12 — Seção 1: Perfil Básico */}
      <ProfileCard profile={profile} bodyComposition={bodyComposition} userName={userName} />

      {/* E12 — Seção 2: Últimos Documentos */}
      <RecentDocsCard
        docs={recentDocs}
      />

      {/* E12 — Seção 3: Resumo de Saúde */}
      <HealthSummaryCard analysis={livingAnalysis} />

      {/* E13-07 — Produtos */}
      <ProductsCard products={productsSummary} />

      {/* Auto-trigger de análise (comportamento existente preservado) */}
      {needsAnalysisUpdate && (
        <div className="rounded-xl border border-dashed border-foreground/15 bg-foreground/2 px-4 py-4 flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-muted-foreground">
            {triggering || legacyLivingAnalysis?.status === 'processing'
              ? 'Seu exame foi processado e a análise está sendo atualizada automaticamente.'
              : 'Seu exame foi processado. A análise será atualizada automaticamente.'}
          </p>
          {(triggering || legacyLivingAnalysis?.status === 'processing') && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Atualizando análise...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { ProfileCard, RecentDocsCard, HealthSummaryCard }
