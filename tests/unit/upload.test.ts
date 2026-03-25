import { describe, it, expect } from 'vitest'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE_BYTES = 20 * 1024 * 1024

function validateFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Tipo não suportado. Use PDF, JPG ou PNG.'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'Arquivo muito grande. Máximo: 20MB.'
  }
  return null
}

describe('upload validation', () => {
  it('rejeita arquivo .docx', () => {
    // #given
    const file = { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 }

    // #when
    const error = validateFile(file)

    // #then
    expect(error).toContain('Tipo não suportado')
  })

  it('rejeita arquivo maior que 20MB', () => {
    // #given
    const file = { type: 'image/jpeg', size: 21 * 1024 * 1024 }

    // #when
    const error = validateFile(file)

    // #then
    expect(error).toContain('muito grande')
  })

  it('aceita PDF válido', () => {
    // #given
    const file = { type: 'application/pdf', size: 5 * 1024 * 1024 }

    // #when
    const error = validateFile(file)

    // #then
    expect(error).toBeNull()
  })

  it('aceita JPG válido', () => {
    // #given
    const file = { type: 'image/jpeg', size: 2 * 1024 * 1024 }

    // #when
    const error = validateFile(file)

    // #then
    expect(error).toBeNull()
  })

  it('aceita PNG válido', () => {
    // #given
    const file = { type: 'image/png', size: 3 * 1024 * 1024 }

    // #when
    const error = validateFile(file)

    // #then
    expect(error).toBeNull()
  })

  it('rejeita arquivo exatamente no limite + 1 byte', () => {
    // #given
    const file = { type: 'image/png', size: MAX_SIZE_BYTES + 1 }

    // #when
    const error = validateFile(file)

    // #then
    expect(error).toContain('muito grande')
  })

  it('aceita arquivo exatamente no limite de 20MB', () => {
    // #given
    const file = { type: 'application/pdf', size: MAX_SIZE_BYTES }

    // #when
    const error = validateFile(file)

    // #then
    expect(error).toBeNull()
  })
})
