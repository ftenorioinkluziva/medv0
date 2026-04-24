import { DOCUMENT_UPLOAD_ACCEPTED_TYPES, DOCUMENT_UPLOAD_MAX_SIZE_BYTES } from './upload-config'

/**
 * Magic numbers (file signatures) para validação de integridade de arquivo
 * Verifica os primeiros bytes do arquivo para confirmar o tipo real
 */
const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [
    [0xff, 0xd8, 0xff, 0xe0], // JPEG com JFIF
    [0xff, 0xd8, 0xff, 0xe1], // JPEG com EXIF
    [0xff, 0xd8, 0xff, 0xdb], // JPEG básico
  ],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]], // PNG
}

/**
 * Valida a assinatura do arquivo (magic bytes)
 * Retorna o MIME type real baseado na assinatura
 */
export function validateFileSignature(buffer: Buffer): string | null {
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const signature of signatures) {
      if (buffer.length < signature.length) continue

      let matches = true
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          matches = false
          break
        }
      }

      if (matches) return mimeType
    }
  }

  return null
}

/**
 * Remove caracteres perigosos do nome do arquivo
 * Mantém apenas alfanuméricos, pontos, hífens e underscores
 */
export function sanitizeFileName(fileName: string): string {
  // Remove extensão e se reencontra
  const nameParts = fileName.split('.')
  const extension = nameParts.length > 1 ? '.' + nameParts[nameParts.length - 1] : ''
  const name = nameParts.slice(0, -1).join('.')

  // Remove caracteres perigosos
  const sanitized = name
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_') // Substitui espaços por underscores
    .replace(/-+/g, '-') // Remove hífens múltiplos
    .replace(/_+/g, '_') // Remove underscores múltiplos
    .trim()
    .substring(0, 255) // Limita a 255 caracteres

  return sanitized ? sanitized + extension : 'document' + extension
}

/**
 * Valida tamanho do arquivo
 */
export function validateFileSize(sizeBytes: number): { valid: boolean; error?: string } {
  if (sizeBytes <= 0) {
    return { valid: false, error: 'Arquivo vazio.' }
  }

  if (sizeBytes > DOCUMENT_UPLOAD_MAX_SIZE_BYTES) {
    const maxMB = DOCUMENT_UPLOAD_MAX_SIZE_BYTES / (1024 * 1024)
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxMB.toFixed(0)}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Valida tipo MIME declarado vs real
 * Usa tanto MIME type quanto magic bytes
 */
export function validateMimeType(
  declaredType: string,
  buffer: Buffer,
): { valid: boolean; mimeType?: string; error?: string } {
  // Primeiro verifica se o tipo declarado está na lista de aceitos
  if (!DOCUMENT_UPLOAD_ACCEPTED_TYPES.includes(declaredType)) {
    return { valid: false, error: 'Tipo de arquivo não suportado.' }
  }

  // Valida a assinatura real do arquivo
  const actualType = validateFileSignature(buffer)

  // Se não conseguir determinar, mas o tipo declarado é aceito, permite (com aviso)
  if (!actualType) {
    return {
      valid: true,
      mimeType: declaredType,
    }
  }

  // Se a assinatura real não bate com o declarado, rejeita
  if (actualType !== declaredType) {
    return {
      valid: false,
      error: `Extensão de arquivo não corresponde ao conteúdo real. Detectado: ${actualType}`,
    }
  }

  return {
    valid: true,
    mimeType: actualType,
  }
}

/**
 * Executa validações completas de upload
 */
export function validateUpload(
  file: File,
  buffer: Buffer,
): {
  valid: boolean
  sanitizedFileName?: string
  mimeType?: string
  error?: string
} {
  // Validar tamanho
  const sizeCheck = validateFileSize(file.size)
  if (!sizeCheck.valid) {
    return { valid: false, error: sizeCheck.error }
  }

  // Validar MIME type
  const mimeCheck = validateMimeType(file.type, buffer)
  if (!mimeCheck.valid) {
    return { valid: false, error: mimeCheck.error }
  }

  // Sanitizar nome
  const sanitizedFileName = sanitizeFileName(file.name)

  return {
    valid: true,
    sanitizedFileName,
    mimeType: mimeCheck.mimeType,
  }
}
