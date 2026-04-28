'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2, LogOut } from 'lucide-react'

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
  bioimpedance: 'bg-[#ede9fe] text-[#5b21b6]',
  blood_test: 'bg-[#fde68a] text-[#92400e]',
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
  pending: 'bg-[#fde68a] text-[#92400e]',
  processing: 'bg-[#dbeafe] text-[#1e40af]',
  completed: 'bg-[#d1fae5] text-[#065f46]',
  failed: 'bg-[#fee2e2] text-[#991b1b]',
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
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* card header */}
        <div className="flex h-14 items-center justify-between px-5">
          <div className="flex flex-col gap-2">
            <h2 id="profile-heading" className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
              {displayName(userName)}
            </h2>
            {profile && (
              <p className="text-xs font-medium text-muted-foreground">
                {profile.age} anos • {genderLabel(profile.gender)}
              </p>
            )}
          </div>
          <Link
            href="/app/profile"
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Atualizar perfil →
          </Link>
        </div>

        {/* stats row */}
        {!profile ? (
          <div className="px-5 pb-4">
            <p className="text-sm text-muted-foreground">
              Complete seu perfil para ver seus dados de saúde aqui.
            </p>
          </div>
        ) : (
          <div className="flex px-5 pb-4 gap-0">
            <div className="flex flex-col gap-0.5 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground">Altura</p>
              <p className="font-heading text-[13px] font-semibold text-foreground">{profile.height} cm</p>
            </div>

            <div className="flex flex-col gap-0.5 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground">Peso</p>
              <p className="font-heading text-[13px] font-semibold text-foreground">
                {weight ? `${parseFloat(weight).toFixed(1)} kg` : '—'}
              </p>
              {weightDelta && <p className="text-[10px] text-muted-foreground">{weightDelta}</p>}
            </div>

            {bodyFat && (
              <div className="flex flex-col gap-0.5 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground">% Gordura</p>
                <p className="font-heading text-[13px] font-semibold text-foreground">
                  {parseFloat(bodyFat).toFixed(1)}%
                </p>
                {bodyFatDelta && <p className="text-[10px] text-muted-foreground">{bodyFatDelta}</p>}
              </div>
            )}

            {bmi && (
              <div className="flex flex-col gap-0.5 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground">IMC</p>
                <p className={cn('font-heading text-[13px] font-semibold', bmiColor(bmi))}>{bmi.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">{bmiLabel(bmi)}</p>
              </div>
            )}

            {profile.inbodyScore != null && (
              <div className="flex flex-col gap-0.5 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground">InBody Score</p>
                <p className="font-heading text-[13px] font-semibold text-primary">{profile.inbodyScore}</p>
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
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* card header */}
        <div className="flex h-13 items-center justify-between px-5">
          <h2 id="docs-heading" className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
            Últimos Documentos
          </h2>
          <Link
            href="/app/history"
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Ver histórico →
          </Link>
        </div>

        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 pb-5 pt-2 text-center">
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
          <div className="flex flex-col gap-2 px-5 pb-3">
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
                  className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="truncate font-heading text-[13px] font-medium text-foreground" title={doc.originalFileName}>
                      {doc.originalFileName}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', catColor)}>
                        {catLabel}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', getStatusColor(doc.processingStatus))}>
                        {getStatusLabel(doc.processingStatus)}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">{date}</span>
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
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex h-13 items-center justify-between px-5">
            <h2 id="summary-heading" className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
              Estado de Saúde
            </h2>
          </div>
          <div className="flex flex-col items-center gap-3 px-5 pb-5 pt-2 text-center">
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
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex h-13 items-center justify-between px-5">
          <h2 id="summary-heading" className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
            Estado de Saúde
          </h2>
          <span className="text-[10px] font-medium text-muted-foreground">{updatedDate}</span>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-4">
          <p className="text-[13px] font-medium text-foreground leading-[1.4286] whitespace-pre-line line-clamp-10">
            {truncated}
          </p>
          <Link
            href={`/app/analyses/${analysis.id}`}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Ver última análise →
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Products Card ───────────────────────────────────────────────────────────

const PRODUCT_ITEMS = [
  { type: 'supplementation', label: 'Suplementação', emoji: '💊', href: '/app/products/supplementation' },
  { type: 'meals', label: 'Plano Alimentar', emoji: '🥗', href: '/app/products/meals' },
  { type: 'workout', label: 'Treino', emoji: '🏋️', href: '/app/products/workout' },
] as const

function ProductsCard({ products }: { products: ProductSummaryItem[] }) {
  if (products.length === 0) return null

  const map = Object.fromEntries(products.map((p) => [p.productType, p]))

  return (
    <section aria-labelledby="products-heading">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* card header */}
        <div className="flex h-13 items-center justify-between px-5">
          <h2 id="products-heading" className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
            Meus Planos
          </h2>
          <Link href="/app/products" className="text-[11px] font-medium text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="flex gap-2 px-5 pb-4">
          {PRODUCT_ITEMS.map(({ type, label, emoji, href }) => {
            const product = map[type]
            return (
              <Link
                key={type}
                href={product ? href : '/app/products'}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center transition-colors',
                  product ? 'hover:bg-muted/50' : 'opacity-50 pointer-events-none',
                )}
                aria-disabled={!product}
                tabIndex={product ? 0 : -1}
              >
                <span className="font-heading text-xl font-medium leading-[1.4286]" aria-hidden="true">{emoji}</span>
                <span className="text-[11px] font-medium leading-tight text-foreground">{label}</span>
                {product && (
                  <span className="text-[10px] font-medium text-muted-foreground">
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
      <div className="flex h-14 items-center justify-between px-0">
        <h1 className="font-heading text-[20px] font-bold leading-[1.4286] text-foreground">
          Olá, {displayName(userName)}
        </h1>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          aria-label="Sair"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* E12 — Seção 1: Perfil Básico */}
      <ProfileCard profile={profile} bodyComposition={bodyComposition} userName={userName} />

      {/* E12 — Seção 3: Resumo de Saúde */}
      <HealthSummaryCard analysis={livingAnalysis} />

      {/* E13-07 — Planos */}
      <ProductsCard products={productsSummary} />

      {/* E12 — Seção 2: Últimos Documentos */}
      <RecentDocsCard
        docs={recentDocs}
      />

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
