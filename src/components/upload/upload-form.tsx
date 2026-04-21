'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Droplets, FileText, Scale, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DOCUMENT_UPLOAD_ACCEPTED_TYPES,
  DOCUMENT_UPLOAD_CLIENT_TIMEOUT_MS,
  DOCUMENT_UPLOAD_MAX_SIZE_BYTES,
} from '@/lib/documents/upload-config'

type UploadStep =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'extracting'
  | 'saving'
  | 'categorizing'
  | 'done'

type DocumentCategory = 'bioimpedance' | 'blood_test' | 'other'

const VALID_CATEGORIES: DocumentCategory[] = ['bioimpedance', 'blood_test', 'other']

const STEP_LABELS: Record<UploadStep, string> = {
  idle: '',
  preparing: 'Preparando...',
  uploading: 'Enviando...',
  extracting: 'Extraindo dados...',
  saving: 'Salvando...',
  categorizing: '',
  done: 'Concluído!',
}

const STEP_PROGRESS: Record<UploadStep, number> = {
  idle: 0,
  preparing: 10,
  uploading: 40,
  extracting: 70,
  saving: 90,
  categorizing: 100,
  done: 100,
}

const CATEGORY_OPTIONS: {
  value: DocumentCategory
  label: string
  Icon: React.ElementType
}[] = [
  { value: 'bioimpedance', label: 'Bioimpedância', Icon: Scale },
  { value: 'blood_test', label: 'Exames de Sangue', Icon: Droplets },
  { value: 'other', label: 'Outros', Icon: FileText },
]

interface FilePreview {
  file: File
  previewUrl: string | null
}

interface UploadSuccessInfo {
  fileName: string
  type?: 'lab_test' | 'body_composition'
  documentId?: string
  category?: DocumentCategory
}

export function UploadForm() {
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [step, setStep] = useState<UploadStep>('idle')
  const [successInfo, setSuccessInfo] = useState<UploadSuccessInfo | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('other')
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  useEffect(() => {
    return () => {
      if (preview?.previewUrl) URL.revokeObjectURL(preview.previewUrl)
    }
  }, [preview?.previewUrl])

  function handleFileSelected(file: File) {
    if (preview?.previewUrl) URL.revokeObjectURL(preview.previewUrl)
    if (!DOCUMENT_UPLOAD_ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Tipo não suportado. Use PDF, JPG ou PNG.')
      return
    }
    if (file.size > DOCUMENT_UPLOAD_MAX_SIZE_BYTES) {
      toast.error('Arquivo muito grande. Máximo: 20MB.')
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
    setSelectedCategory('other')
  }

  async function handleSubmit() {
    if (!preview) return

    const controller = new AbortController()
    abortControllerRef.current = controller

    const timeout = setTimeout(() => {
      controller.abort()
      toast.error('Tempo esgotado. Tente novamente.')
      setStep('idle')
    }, DOCUMENT_UPLOAD_CLIENT_TIMEOUT_MS)

    try {
      setStep('preparing')

      const formData = new FormData()
      formData.append('file', preview.file)

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
      }

      setSuccessInfo(info)
      setSelectedCategory(validCategory)
      setStep('categorizing')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      toast.error((err as Error).message ?? 'Erro inesperado. Tente novamente.')
      setStep('idle')
    } finally {
      clearTimeout(timeout)
    }
  }

  async function handleConfirmCategory() {
    if (!successInfo?.documentId) {
      setStep('done')
      return
    }

    setIsSavingCategory(true)
    try {
      const res = await fetch(`/api/documents/${successInfo.documentId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Erro ao salvar categoria.')
      }

      setSuccessInfo((prev) => (prev ? { ...prev, category: selectedCategory } : prev))
      toast.success('Exame processado!')
      setStep('done')
    } catch (err) {
      toast.error((err as Error).message ?? 'Erro ao salvar categoria.')
    } finally {
      setIsSavingCategory(false)
    }
  }

  const isProcessing = step !== 'idle' && step !== 'done' && step !== 'categorizing'

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
      {/* Seleção de arquivo */}
      {!preview && (
        <div className="flex flex-col gap-3">
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

          <Button
            variant="default"
            size="lg"
            className="w-full gap-2"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-5 w-5" />
            Tirar foto do exame
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-5 w-5" />
            Selecionar arquivo
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            PDF, JPG ou PNG — máximo 20MB
          </p>
        </div>
      )}

      {/* Preview + envio */}
      {preview && (
        <Card>
          <CardContent className="p-4 flex flex-col gap-4">
            {/* Preview */}
            <div className="flex items-center gap-3">
              {preview.previewUrl ? (
                <Image
                  src={preview.previewUrl}
                  alt="Preview do exame"
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded object-cover shrink-0"
                  unoptimized
                />
              ) : (
                <div className="h-16 w-16 rounded bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{preview.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(preview.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              {!isProcessing && step !== 'categorizing' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={handleCancel}
                  aria-label="Remover arquivo"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Progresso */}
            {step !== 'idle' && step !== 'categorizing' && step !== 'done' && (
              <div className="flex flex-col gap-1.5">
                <Progress value={STEP_PROGRESS[step]} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{STEP_LABELS[step]}</p>
              </div>
            )}

            {/* Seletor de categoria */}
            {step === 'categorizing' && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Tipo de documento</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Classificado automaticamente. Ajuste se necessário.
                  </p>
                </div>
                <div role="radiogroup" aria-label="Tipo de documento" className="flex flex-col gap-2">
                  {CATEGORY_OPTIONS.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selectedCategory === value}
                      tabIndex={selectedCategory === value ? 0 : -1}
                      onClick={() => setSelectedCategory(value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedCategory(value)
                        }
                      }}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        selectedCategory === value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={handleConfirmCategory}
                  disabled={isSavingCategory}
                >
                  {isSavingCategory ? 'Salvando...' : 'Confirmar'}
                </Button>
              </div>
            )}

            {/* Ações padrão */}
            {step !== 'categorizing' && (
              <div className="flex gap-2">
                {isProcessing ? (
                  <Button variant="outline" className="flex-1" onClick={handleCancel}>
                    Cancelar
                  </Button>
                ) : step === 'done' ? (
                  <>
                    <Button variant="outline" className="flex-1" onClick={handleCancel}>
                      Enviar outro
                    </Button>
                    <Button className="flex-1" onClick={() => router.push('/app/dashboard')}>
                      Ir para dashboard
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1" onClick={handleCancel}>
                      Cancelar
                    </Button>
                    <Button className="flex-1" onClick={handleSubmit}>
                      Enviar exame
                    </Button>
                  </>
                )}
              </div>
            )}

            {step === 'done' && successInfo && (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                {successInfo.type === 'body_composition' ? (
                  <>
                    <p className="font-medium">Dados de composição corporal atualizados no seu perfil.</p>
                    <p className="mt-1 break-all">Documento: {successInfo.fileName}</p>
                    <p className="mt-1">
                      <Link href="/app/profile" className="underline underline-offset-2">
                        Visualizar perfil atualizado
                      </Link>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Upload concluído com sucesso.</p>
                    <p className="mt-1 break-all">Documento: {successInfo.fileName}</p>
                    <p className="mt-1">A análise será iniciada automaticamente pelo servidor usando este exame.</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
