'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Camera, FileText, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE_BYTES = 20 * 1024 * 1024

type UploadStep = 'idle' | 'preparing' | 'uploading' | 'extracting' | 'saving' | 'done'

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

interface FilePreview {
  file: File
  previewUrl: string | null
}

export function UploadForm() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [step, setStep] = useState<UploadStep>('idle')

  useEffect(() => {
    return () => {
      if (preview?.previewUrl) URL.revokeObjectURL(preview.previewUrl)
    }
  }, [preview?.previewUrl])

  function handleFileSelected(file: File) {
    if (preview?.previewUrl) URL.revokeObjectURL(preview.previewUrl)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Tipo não suportado. Use PDF, JPG ou PNG.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
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
  }

  async function handleSubmit() {
    if (!preview) return

    const controller = new AbortController()
    abortControllerRef.current = controller

    const timeout = setTimeout(() => {
      controller.abort()
      toast.error('Tempo esgotado. Tente novamente.')
      setStep('idle')
    }, 30_000)

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

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? 'Erro ao processar arquivo.')
      }

      setStep('done')
      toast.success('Exame processado! Acesse o dashboard para ver a análise.')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      toast.error((err as Error).message ?? 'Erro inesperado. Tente novamente.')
      setStep('idle')
    } finally {
      clearTimeout(timeout)
    }
  }

  const isProcessing = step !== 'idle' && step !== 'done'

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
              {!isProcessing && (
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
            {step !== 'idle' && (
              <div className="flex flex-col gap-1.5">
                <Progress value={STEP_PROGRESS[step]} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {STEP_LABELS[step]}
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2">
              {isProcessing ? (
                <Button variant="outline" className="flex-1" onClick={handleCancel}>
                  Cancelar
                </Button>
              ) : step === 'done' ? (
                <Button variant="outline" className="flex-1" onClick={handleCancel}>
                  Enviar outro
                </Button>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
