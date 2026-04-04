import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((opts) => opts),
  },
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => 'mocked-google-model'),
}))

const {
  extractMedicalDocument,
  hasUsableMedicalDocumentData,
  EXTRACTION_FAILURE_SUMMARY,
} = await import('@/lib/documents/extractor')
const { generateText } = await import('ai')

const VALID_OUTPUT: SanitizedMedicalDocument = {
  documentType: 'Hemograma Completo',
  examDate: '2024-01-15',
  overallSummary: 'Exame dentro dos parametros normais.',
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

  it('usa payload multimodal com arquivo para PDF', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

    await extractMedicalDocument(Buffer.from('pdf-binary'), 'exame.pdf', 'application/pdf')

    const callArgs = vi.mocked(generateText).mock.calls[0][0]
    const content = callArgs.messages![0].content as Array<{ type: string; mediaType?: string }>
    expect(Array.isArray(content)).toBe(true)
    expect(content.some((p) => p.type === 'file' && p.mediaType === 'application/pdf')).toBe(true)
  })

  it('usa payload multimodal com imagem para JPEG', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: VALID_OUTPUT } as never)

    await extractMedicalDocument(Buffer.from('image-binary'), 'exame.jpg', 'image/jpeg')

    const callArgs = vi.mocked(generateText).mock.calls[0][0]
    const content = callArgs.messages![0].content as Array<{ type: string; mediaType?: string }>
    expect(content.some((p) => p.type === 'image' && p.mediaType === 'image/jpeg')).toBe(true)
  })

  it('retorna fallback UNKNOWN quando generateText falha', async () => {
    vi.mocked(generateText).mockRejectedValue(new Error('Gemini timeout'))

    const result = await extractMedicalDocument(Buffer.from('pdf'), 'exame.pdf', 'application/pdf')

    expect(result.documentType).toBe('UNKNOWN')
    expect(result.overallSummary).toBe(EXTRACTION_FAILURE_SUMMARY)
    expect(result.modules).toEqual([])
  })

  it('marca fallback como nao utilizavel', () => {
    const fallback = {
      documentType: 'UNKNOWN',
      overallSummary: EXTRACTION_FAILURE_SUMMARY,
      patientInfo: {},
      modules: [],
    }

    expect(hasUsableMedicalDocumentData(fallback)).toBe(false)
  })

  it('marca extracao valida como utilizavel', () => {
    expect(hasUsableMedicalDocumentData(VALID_OUTPUT)).toBe(true)
  })
})
