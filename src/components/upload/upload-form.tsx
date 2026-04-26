'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DOCUMENT_UPLOAD_ACCEPTED_TYPES,
  DOCUMENT_UPLOAD_CLIENT_TIMEOUT_MS,
  DOCUMENT_UPLOAD_MAX_SIZE_BYTES,
} from '@/lib/documents/upload-config'
import { useErrorHandler } from '@/hooks/use-error-handler'

type UploadStep =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'extracting'
  | 'saving'
  | 'done'

type DocumentCategory = 'bioimpedance' | 'blood_test' | 'other'

const VALID_CATEGORIES: DocumentCategory[] = ['bioimpedance', 'blood_test', 'other']

const STEP_LABELS: Record<UploadStep, string> = {
  idle: '',
  preparing: 'Preparando...',
  uploading: 'Enviando...',
  extracting: 'Extraindo dados...',
  saving: 'Salvando...',
  done: 'Concluído!',
}

const STEP_PROGRESS: Record<UploadStep, number> = {
  idle: 0,
  preparing: 10,
  uploading: 40,
  extracting: 70,
  saving: 90,
  done: 100,
}

const CATEGORY_OPTIONS: {
  value: DocumentCategory
  label: string
  emoji: string
}[] = [
  { value: 'bioimpedance', label: 'Bioimpedância', emoji: '⚖️' },
  { value: 'blood_test', label: 'Exames de Sangue', emoji: '🩸' },
  { value: 'other', label: 'Outros', emoji: '📄' },
]

interface FilePreview {
  file: File
  previewUrl: string | null
}

interface BodyMetrics {
  weight?: number
  bodyFat?: number
  muscleMass?: number
  visceralFat?: number
  boneMass?: number
  bmr?: number
  bodyWater?: number
  bodyWaterLiters?: number
  proteinMass?: number
  waistHipRatio?: number
  obesityDegree?: number
  inbodyScore?: number
  idealWeight?: number
}

interface UploadSuccessInfo {
  fileName: string
  type?: 'lab_test' | 'body_composition'
  documentId?: string
  category?: DocumentCategory
  metrics?: BodyMetrics
}

const METRIC_LABELS: Array<{ key: keyof BodyMetrics; label: string; unit: string }> = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'bodyFat', label: 'Gordura corporal', unit: '%' },
  { key: 'muscleMass', label: 'Massa muscular', unit: 'kg' },
  { key: 'visceralFat', label: 'Gordura visceral', unit: 'nível' },
  { key: 'boneMass', label: 'Massa óssea', unit: 'kg' },
  { key: 'bmr', label: 'Taxa metabólica basal', unit: 'kcal' },
  { key: 'bodyWater', label: 'Água corporal', unit: '%' },
  { key: 'bodyWaterLiters', label: 'Água corporal', unit: 'L' },
  { key: 'proteinMass', label: 'Massa proteica', unit: 'kg' },
  { key: 'waistHipRatio', label: 'Relação cintura/quadril', unit: '' },
  { key: 'obesityDegree', label: 'Grau de obesidade', unit: '%' },
  { key: 'inbodyScore', label: 'InBody score', unit: '' },
  { key: 'idealWeight', label: 'Peso ideal', unit: 'kg' },
]

function BodyCompositionSummary({ metrics }: { metrics: BodyMetrics }) {
  const rows = METRIC_LABELS.filter(({ key }) => metrics[key] !== undefined)
  if (rows.length === 0) return null

  return (
    <div className="mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          {rows.map(({ key, label, unit }) => (
            <tr key={key} className="border-b border-emerald-500/10 last:border-0">
              <td className="px-2 py-1 text-emerald-700/70 dark:text-emerald-400/70">{label}</td>
              <td className="px-2 py-1 text-right font-medium tabular-nums">
                {metrics[key]}{unit ? ` ${unit}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function UploadForm() {
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [step, setStep] = useState<UploadStep>('idle')
  const [successInfo, setSuccessInfo] = useState<UploadSuccessInfo | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | ''>('')
  const { errorMessage, handleError, clearError } = useErrorHandler()

  useEffect(() => {
    return () => {
      if (preview?.previewUrl) URL.revokeObjectURL(preview.previewUrl)
    }
  }, [preview?.previewUrl])

  function handleFileSelected(file: File) {
    if (preview?.previewUrl) URL.revokeObjectURL(preview.previewUrl)
    clearError()

    if (!DOCUMENT_UPLOAD_ACCEPTED_TYPES.includes(file.type)) {
      const message = 'Tipo não suportado. Use PDF, JPG ou PNG.'
      handleError(message)
      toast.error(message)
      return
    }

    if (file.size > DOCUMENT_UPLOAD_MAX_SIZE_BYTES) {
      const message = 'Arquivo muito grande. Máximo: 20MB.'
      handleError(message)
      toast.error(message)
      return
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setPreview({ file, previewUrl })
    setStep('idle')
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelected(file)
    e.target.value = ''
  }

  function handleCancel() {
    abortControllerRef.current?.abort()
    setStep('idle')
    setPreview(null)
    setSuccessInfo(null)
    setSelectedCategory('')
    clearError()
  }

  async function handleSubmit() {
    if (!preview) return
    if (!selectedCategory) {
      const message = 'Selecione o tipo de documento antes de enviar.'
      handleError(message)
      toast.error(message)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const timeout = setTimeout(() => {
      controller.abort()
      const message = 'Tempo esgotado. Tente novamente.'
      handleError(message)
      toast.error(message)
      setStep('idle')
    }, DOCUMENT_UPLOAD_CLIENT_TIMEOUT_MS)

    try {
      clearError()
      setStep('preparing')

      const formData = new FormData()
      formData.append('file', preview.file)
      formData.append('category', selectedCategory)

      setStep('uploading')
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      setStep('extracting')
      await new Promise((r) => setTimeout(r, 500))

      setStep('saving')
      await new Promise((r) => setTimeout(r, 300))

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? 'Erro ao processar arquivo.')
      }

      const rawCategory = payload.category
      const validCategory: DocumentCategory = VALID_CATEGORIES.includes(rawCategory)
        ? (rawCategory as DocumentCategory)
        : 'other'

      const info: UploadSuccessInfo = {
        fileName: payload.fileName ?? preview.file.name,
        type: payload.type,
        documentId: payload.documentId,
        category: validCategory,
        metrics: payload.metrics,
      }

      setSuccessInfo(info)
      setSelectedCategory(validCategory)
      setStep('done')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const message = (err as Error).message ?? 'Erro inesperado. Tente novamente.'
      handleError(message)
      toast.error(message)
      setStep('idle')
    } finally {
      clearTimeout(timeout)
    }
  }

  function renderCategoryPicker() {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex h-12 items-center px-5">
          <p className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
            Tipo de documento
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Tipo de documento"
          className="flex gap-2 px-5 pb-4"
        >
          {CATEGORY_OPTIONS.map(({ value, label, emoji }, index) => {
            const isSelected = selectedCategory === value
            return (
              <button
                key={value}
                id={`category-option-${value}`}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setSelectedCategory(value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedCategory(value)
                  } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    e.preventDefault()
                    const next = CATEGORY_OPTIONS[(index + 1) % CATEGORY_OPTIONS.length]
                    setSelectedCategory(next.value)
                    document.getElementById(`category-option-${next.value}`)?.focus()
                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    e.preventDefault()
                    const prev = CATEGORY_OPTIONS[(index - 1 + CATEGORY_OPTIONS.length) % CATEGORY_OPTIONS.length]
                    setSelectedCategory(prev.value)
                    document.getElementById(`category-option-${prev.value}`)?.focus()
                  }
                }}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors ${
                  isSelected
                    ? 'bg-primary'
                    : 'border border-border bg-card hover:bg-muted/50'
                }`}
              >
                <span className="font-heading text-lg font-medium leading-[1.4286]" aria-hidden="true">
                  {emoji}
                </span>
                <span className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const isProcessing = step !== 'idle' && step !== 'done'

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Category picker — sempre visível */}
      {renderCategoryPicker()}

      {/* Dropzone / arquivo card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex h-12 items-center px-5">
          <p className="font-heading text-sm font-semibold leading-[1.4286] text-foreground">
            Arquivo
          </p>
        </div>

        <div className="px-5 pb-4">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleInputChange}
            aria-label="Tirar foto com câmera"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={handleInputChange}
            aria-label="Selecionar arquivo"
          />

          {!preview ? (
            /* Dropzone idle */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-35 w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted transition-colors hover:bg-muted/70"
              aria-label="Selecionar arquivo para upload"
            >
              <span className="font-heading text-[28px] font-medium leading-[1.4286]" aria-hidden="true">📎</span>
              <span className="font-heading text-[13px] font-medium text-foreground">
                Arraste ou toque para selecionar
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                PDF ou imagem • máx 20 MB
              </span>
            </button>
          ) : (
            /* Preview do arquivo selecionado */
            <div className="flex flex-col gap-3" aria-busy={isProcessing}>
              <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
                {preview.previewUrl ? (
                  <Image
                    src={preview.previewUrl}
                    alt="Preview do exame"
                    width={48}
                    height={48}
                    sizes="48px"
                    className="h-12 w-12 rounded-lg object-cover shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-card flex items-center justify-center shrink-0 border border-border">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-[13px] font-medium text-foreground truncate">
                    {preview.file.name}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {(preview.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                {!isProcessing && (
                  <button
                    type="button"
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={handleCancel}
                    aria-label="Remover arquivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Progresso */}
              {step !== 'idle' && step !== 'done' && (
                <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
                  <Progress value={STEP_PROGRESS[step]} className="h-2" />
                  <p className="text-[11px] font-medium text-muted-foreground text-center">
                    {STEP_LABELS[step]}
                  </p>
                </div>
              )}

              {/* Sucesso */}
              {step === 'done' && successInfo && (
                <div className="rounded-xl border border-[#d1fae5] bg-[#d1fae5]/50 px-3 py-2.5" role="status" aria-live="polite">
                  {successInfo.type === 'body_composition' ? (
                    <>
                      <p className="text-[13px] font-medium text-[#065f46]">
                        Composição corporal atualizada no seu perfil.
                      </p>
                      {successInfo.metrics && <BodyCompositionSummary metrics={successInfo.metrics} />}
                      <p className="mt-2">
                        <Link href="/app/profile" className="text-[11px] font-medium text-primary underline-offset-2 hover:underline">
                          Ver perfil completo
                        </Link>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] font-medium text-[#065f46]">Upload concluído com sucesso.</p>
                      <p className="mt-1 text-[11px] font-medium text-[#065f46] break-all">
                        {successInfo.fileName}
                      </p>
                    </>
                  )}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive" aria-live="polite">
                  {errorMessage}
                </div>
              )}

              {/* Ações quando há arquivo preview mas ainda não enviou */}
              {step === 'done' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="h-12 flex-1 rounded-xl"
                    onClick={handleCancel}
                  >
                    Enviar outro
                  </Button>
                  <Button
                    type="button"
                    className="h-12 flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => router.push('/app/dashboard')}
                  >
                    Ir para dashboard
                  </Button>
                </div>
              )}

              {isProcessing && (
                <Button variant="outline" className="h-12 w-full rounded-xl" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botão submit — visível só quando há arquivo e ainda não enviou */}
      {preview && !isProcessing && step !== 'done' && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedCategory}
          className="h-12 w-full rounded-xl bg-primary text-[15px] font-semibold text-foreground transition-opacity disabled:opacity-40 font-heading"
        >
          Enviar exame
        </button>
      )}
    </div>
  )
}
