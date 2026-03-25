import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

// Mock the AI SDK and Google provider before importing extractor
vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((opts) => opts),
  },
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mocked-google-model'),
}))

vi.mock('pdf-parse', () => {
  const fn = vi.fn()
  return { ...fn, default: fn }
})

const { extractMedicalDocument } = await import('@/lib/documents/extractor')
const { generateText } = await import('ai')
const pdfParseMod = await import('pdf-parse')
const pdfParse = (pdfParseMod as unknown as { default: ReturnType<typeof vi.fn> }).default

const VALID_OUTPUT: SanitizedMedicalDocument = {
  documentType: 'Hemograma Completo',
  examDate: '2024-01-15',
  overallSummary: 'Exame dentro dos parâmetros normais.',
  patientInfo: { age: 35, gender: 'M' },
  providerInfo: { laboratory: 'Lab Central' },
  modules: [
    {
      moduleName: 'Eritrograma',
      category: 'Hematologia',
      status: 'normal',
      summary: 'Valores normais',
      parameters: [
        {
          name: 'Hemoglobina',
          value: 14.5,
          unit: 'g/dL',
          referenceRange: '13.5-17.5',
          status: 'normal',
        },
      ],
    },
  ],
}

describe('extractMedicalDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PDF extraction', () => {
    it('should extract text via pdf-parse and return structured output', async () => {
      // #given
      const pdfBuffer = Buffer.from('fake pdf content')
      vi.mocked(pdfParse).mockResolvedValue({ text: 'Hemograma texto extraído' } as never)
      vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

      // #when
      const result = await extractMedicalDocument(pdfBuffer, 'exame.pdf', 'application/pdf')

      // #then
      expect(pdfParse).toHaveBeenCalledWith(pdfBuffer)
      expect(result.documentType).toBe('Hemograma Completo')
      expect(result.modules).toHaveLength(1)
    })

    it('should truncate PDF text exceeding 200k chars and include warning', async () => {
      // #given
      const longText = 'x'.repeat(250_000)
      vi.mocked(pdfParse).mockResolvedValue({ text: longText } as never)
      vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

      // #when
      await extractMedicalDocument(Buffer.from('pdf'), 'long.pdf', 'application/pdf')

      // #then
      const callArgs = vi.mocked(generateText).mock.calls[0][0]
      const messageContent =
        typeof callArgs.messages![0].content === 'string'
          ? callArgs.messages![0].content
          : ''
      expect(messageContent).toContain('[AVISO: Documento truncado em 200000 caracteres]')
      expect(messageContent.length).toBeLessThan(250_000 + 200)
    })
  })

  describe('Image extraction', () => {
    it('should send image as multimodal content for JPEG', async () => {
      // #given
      const imageBuffer = Buffer.from('fake jpeg data')
      vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

      // #when
      const result = await extractMedicalDocument(imageBuffer, 'exame.jpg', 'image/jpeg')

      // #then
      expect(pdfParse).not.toHaveBeenCalled()
      const callArgs = vi.mocked(generateText).mock.calls[0][0]
      const content = callArgs.messages![0].content as Array<{ type: string }>
      expect(content.some((c) => c.type === 'image')).toBe(true)
      expect(result.documentType).toBe('Hemograma Completo')
    })

    it('should send image as multimodal content for PNG', async () => {
      // #given
      const imageBuffer = Buffer.from('fake png data')
      vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

      // #when
      await extractMedicalDocument(imageBuffer, 'exame.png', 'image/png')

      // #then
      const callArgs = vi.mocked(generateText).mock.calls[0][0]
      const content = callArgs.messages![0].content as Array<{ type: string; mediaType?: string }>
      const imageContent = content.find((c) => c.type === 'image')
      expect(imageContent?.mediaType).toBe('image/png')
    })
  })

  describe('PII sanitization (LGPD)', () => {
    it('should not include name, cpf, or rg in the output', async () => {
      // #given
      vi.mocked(pdfParse).mockResolvedValue({ text: 'texto do exame' } as never)
      vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

      // #when
      const result = await extractMedicalDocument(
        Buffer.from('pdf'),
        'exame.pdf',
        'application/pdf',
      )

      // #then
      const patientInfo = result.patientInfo as Record<string, unknown>
      expect(patientInfo).not.toHaveProperty('fullName')
      expect(patientInfo).not.toHaveProperty('cpf')
      expect(patientInfo).not.toHaveProperty('rg')
      expect(patientInfo).not.toHaveProperty('id_cpf')
      expect(patientInfo).not.toHaveProperty('id_rg')
    })

    it('should not include patientInfo PII fields in output schema', async () => {
      // #given
      vi.mocked(pdfParse).mockResolvedValue({ text: 'texto' } as never)
      vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

      // #when
      const result = await extractMedicalDocument(
        Buffer.from('pdf'),
        'exame.pdf',
        'application/pdf',
      )

      // #then
      const patientKeys = Object.keys(result.patientInfo)
      expect(patientKeys).not.toContain('name')
      expect(patientKeys).not.toContain('cpf')
      expect(patientKeys).not.toContain('rg')
    })
  })

  describe('Fallback on error', () => {
    it('should return UNKNOWN fallback when generateText throws', async () => {
      // #given
      vi.mocked(pdfParse).mockResolvedValue({ text: 'texto' } as never)
      vi.mocked(generateText).mockRejectedValue(new Error('Gemini timeout'))

      // #when
      const result = await extractMedicalDocument(
        Buffer.from('pdf'),
        'exame.pdf',
        'application/pdf',
      )

      // #then
      expect(result.documentType).toBe('UNKNOWN')
      expect(result.overallSummary).toBe('Não foi possível extrair os dados')
      expect(result.modules).toEqual([])
    })

    it('should return UNKNOWN fallback when pdf-parse throws', async () => {
      // #given
      vi.mocked(pdfParse).mockRejectedValue(new Error('PDF corrupted'))

      // #when
      const result = await extractMedicalDocument(
        Buffer.from('bad pdf'),
        'corrompido.pdf',
        'application/pdf',
      )

      // #then
      expect(result.documentType).toBe('UNKNOWN')
      expect(result.modules).toEqual([])
    })

    it('should return valid structure on fallback (no throw)', async () => {
      // #given
      vi.mocked(pdfParse).mockRejectedValue(new Error('error'))

      // #when
      const act = () =>
        extractMedicalDocument(Buffer.from('pdf'), 'exame.pdf', 'application/pdf')

      // #then — should never throw, always resolve
      await expect(act()).resolves.not.toThrow()
    })
  })

  describe('Output schema validation', () => {
    it('should return output matching SanitizedMedicalDocument shape', async () => {
      // #given
      vi.mocked(pdfParse).mockResolvedValue({ text: 'texto' } as never)
      vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

      // #when
      const result = await extractMedicalDocument(
        Buffer.from('pdf'),
        'exame.pdf',
        'application/pdf',
      )

      // #then
      expect(result).toHaveProperty('documentType')
      expect(result).toHaveProperty('overallSummary')
      expect(result).toHaveProperty('patientInfo')
      expect(result).toHaveProperty('modules')
      expect(Array.isArray(result.modules)).toBe(true)
    })

    it('should pass temperature 0.1 to generateText for precision', async () => {
      // #given
      vi.mocked(pdfParse).mockResolvedValue({ text: 'texto' } as never)
      vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

      // #when
      await extractMedicalDocument(Buffer.from('pdf'), 'exame.pdf', 'application/pdf')

      // #then
      const callArgs = vi.mocked(generateText).mock.calls[0][0]
      expect(callArgs.temperature).toBe(0.1)
    })
  })
})
