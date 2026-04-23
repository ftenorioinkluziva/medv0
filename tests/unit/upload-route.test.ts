import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = vi.fn()
const mockSelect = vi.fn()
const mockExtractMedicalDocument = vi.fn()
const mockHasUsableMedicalDocumentData = vi.fn()
const mockClassifyDocument = vi.fn()
const mockPersistSnapshot = vi.fn()
const mockPersistFailedDocument = vi.fn()
const mockTriggerLivingAnalysis = vi.fn()
const mockUpdateBodyComposition = vi.fn()

vi.mock('@/lib/auth/config', () => ({
  auth: mockAuth,
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: mockSelect,
  },
}))

vi.mock('@/lib/db/schema', () => ({
  documents: {
    id: 'documents.id',
    userId: 'documents.userId',
    originalFileName: 'documents.originalFileName',
    processingStatus: 'documents.processingStatus',
  },
  snapshots: {
    structuredData: 'snapshots.structuredData',
    documentId: 'snapshots.documentId',
  },
}))

vi.mock('@/lib/documents/extractor', () => ({
  extractMedicalDocument: mockExtractMedicalDocument,
  hasUsableMedicalDocumentData: mockHasUsableMedicalDocumentData,
}))

vi.mock('@/lib/documents/classifier', () => ({
  classifyDocument: mockClassifyDocument,
}))

vi.mock('@/lib/documents/persistence', () => ({
  persistSnapshot: mockPersistSnapshot,
  persistFailedDocument: mockPersistFailedDocument,
}))

vi.mock('@/lib/documents/body-composition', () => ({
  updateBodyComposition: mockUpdateBodyComposition,
}))

vi.mock('@/lib/ai/orchestrator/trigger-living-analysis', () => ({
  triggerLivingAnalysis: mockTriggerLivingAnalysis,
}))

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    after: vi.fn((fn: () => Promise<void>) => {
      void fn()
    }),
  }
})

const { POST } = await import('@/app/api/documents/upload/route')

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  }
}

const USABLE_STRUCTURED_DATA = {
  documentType: 'Hemograma',
  overallSummary: 'Exame normal',
  patientInfo: { age: 35 },
  modules: [
    {
      moduleName: 'Eritrograma',
      category: 'Hematologia',
      status: 'normal',
      summary: 'ok',
      parameters: [{ name: 'Hemoglobina', value: 14.5 }],
    },
  ],
}

function makeUploadRequest(fileName = 'exame.pdf', category?: string) {
  const formData = new FormData()
  formData.append('file', new File(['fake'], fileName, { type: 'application/pdf' }))
  if (category) {
    formData.append('category', category)
  }
  return new NextRequest('http://localhost/api/documents/upload', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/documents/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSelect.mockReturnValue(makeSelectChain([]) as never)
  })

  it('persiste documento como failed e não dispara análise quando a extração não produz dados úteis', async () => {
    // #given
    mockExtractMedicalDocument.mockResolvedValue({
      documentType: 'UNKNOWN',
      overallSummary: 'Não foi possível extrair os dados',
      patientInfo: {},
      modules: [],
    })
    mockHasUsableMedicalDocumentData.mockReturnValue(false)
    mockPersistFailedDocument.mockResolvedValue({ documentId: 'failed-doc-1' })

    // #when
    const response = await POST(makeUploadRequest('falho.pdf'))
    const json = await response.json()

    // #then
    expect(response.status).toBe(422)
    expect(json.error).toContain('Não foi possível extrair dados utilizáveis')
    expect(mockPersistFailedDocument).toHaveBeenCalledOnce()
    expect(mockPersistSnapshot).not.toHaveBeenCalled()
    expect(mockTriggerLivingAnalysis).not.toHaveBeenCalled()
  })

  it('classifica como blood_test: retorna type=lab_test e dispara análise imediatamente', async () => {
    // #given
    mockExtractMedicalDocument.mockResolvedValue(USABLE_STRUCTURED_DATA)
    mockHasUsableMedicalDocumentData.mockReturnValue(true)
    mockClassifyDocument.mockReturnValue('blood_test')
    mockPersistSnapshot.mockResolvedValue({ documentId: 'doc-lab-1' })

    // #when
    const response = await POST(makeUploadRequest('hemograma.pdf'))
    const json = await response.json()

    // #then — análise disparada após upload
    expect(response.status).toBe(200)
    expect(json.type).toBe('lab_test')
    expect(json.documentId).toBe('doc-lab-1')
    expect(json.category).toBe('blood_test')
    expect(mockPersistSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ classifiedDocumentType: 'blood_test' }),
    )
    expect(mockTriggerLivingAnalysis).toHaveBeenCalledOnce()
    expect(mockUpdateBodyComposition).not.toHaveBeenCalled()
  })

  it('usa o tipo selecionado enviado pelo formulário e dispara análise de laboratório', async () => {
    // #given
    mockExtractMedicalDocument.mockResolvedValue(USABLE_STRUCTURED_DATA)
    mockHasUsableMedicalDocumentData.mockReturnValue(true)
    mockPersistSnapshot.mockResolvedValue({ documentId: 'doc-custom-1' })

    // #when
    const response = await POST(makeUploadRequest('hemograma.pdf', 'blood_test'))
    const json = await response.json()

    // #then
    expect(response.status).toBe(200)
    expect(json.category).toBe('blood_test')
    expect(mockPersistSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ classifiedDocumentType: 'blood_test' }),
    )
    expect(mockTriggerLivingAnalysis).toHaveBeenCalledOnce()
    expect(mockUpdateBodyComposition).not.toHaveBeenCalled()
  })

  it('classifica como other: retorna type=lab_test e dispara análise imediatamente', async () => {
    // #given
    mockExtractMedicalDocument.mockResolvedValue(USABLE_STRUCTURED_DATA)
    mockHasUsableMedicalDocumentData.mockReturnValue(true)
    mockClassifyDocument.mockReturnValue('other')
    mockPersistSnapshot.mockResolvedValue({ documentId: 'doc-other-1' })

    // #when
    const response = await POST(makeUploadRequest('desconhecido.pdf'))
    const json = await response.json()

    // #then — análise disparada após upload
    expect(response.status).toBe(200)
    expect(json.type).toBe('lab_test')
    expect(json.documentId).toBe('doc-other-1')
    expect(json.category).toBe('other')
    expect(mockPersistSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ classifiedDocumentType: 'other' }),
    )
    expect(mockTriggerLivingAnalysis).toHaveBeenCalledOnce()
    expect(mockUpdateBodyComposition).not.toHaveBeenCalled()
  })

  it('classifica como bioimpedance: retorna type=body_composition e atualiza composição corporal', async () => {
    // #given
    mockExtractMedicalDocument.mockResolvedValue(USABLE_STRUCTURED_DATA)
    mockHasUsableMedicalDocumentData.mockReturnValue(true)
    mockClassifyDocument.mockReturnValue('bioimpedance')
    mockPersistSnapshot.mockResolvedValue({ documentId: 'doc-bio-1' })
    mockSelect
      .mockReturnValueOnce(makeSelectChain([]) as never)
      .mockReturnValueOnce(makeSelectChain([{ structuredData: USABLE_STRUCTURED_DATA }]) as never)

    // #when
    const response = await POST(makeUploadRequest('bioimpedancia.pdf'))
    const json = await response.json()

    // #then
    expect(response.status).toBe(200)
    expect(json.type).toBe('body_composition')
    expect(json.success).toBe(true)
    expect(json.documentId).toBe('doc-bio-1')
    expect(json.category).toBe('bioimpedance')
    expect(json.message).toBe('Dados de composição corporal detectados')
    expect(mockPersistSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ classifiedDocumentType: 'bioimpedance' }),
    )
    expect(mockUpdateBodyComposition).toHaveBeenCalledOnce()
    expect(mockTriggerLivingAnalysis).not.toHaveBeenCalled()
  })
})
