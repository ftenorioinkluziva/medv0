import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = vi.fn()
const mockSelect = vi.fn()
const mockExtractMedicalDocument = vi.fn()
const mockPersistSnapshot = vi.fn()
const mockPersistFailedDocument = vi.fn()
const mockTriggerLivingAnalysis = vi.fn()

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
}))

vi.mock('@/lib/documents/extractor', () => ({
  extractMedicalDocument: mockExtractMedicalDocument,
  hasUsableMedicalDocumentData: vi.fn(() => false),
}))

vi.mock('@/lib/documents/persistence', () => ({
  persistSnapshot: mockPersistSnapshot,
  persistFailedDocument: mockPersistFailedDocument,
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

describe('POST /api/documents/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persiste documento como failed e não dispara análise quando a extração não produz dados úteis', async () => {
    // #given
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSelect.mockReturnValue(makeSelectChain([]) as never)
    mockExtractMedicalDocument.mockResolvedValue({
      documentType: 'UNKNOWN',
      overallSummary: 'Não foi possível extrair os dados',
      patientInfo: {},
      modules: [],
    })
    mockPersistFailedDocument.mockResolvedValue({ documentId: 'failed-doc-1' })

    const formData = new FormData()
    formData.append('file', new File(['fake'], 'falho.pdf', { type: 'application/pdf' }))
    const request = new NextRequest('http://localhost/api/documents/upload', {
      method: 'POST',
      body: formData,
    })

    // #when
    const response = await POST(request)
    const json = await response.json()

    // #then
    expect(response.status).toBe(422)
    expect(json.error).toContain('Não foi possível extrair dados utilizáveis')
    expect(mockPersistFailedDocument).toHaveBeenCalledOnce()
    expect(mockPersistSnapshot).not.toHaveBeenCalled()
    expect(mockTriggerLivingAnalysis).not.toHaveBeenCalled()
  })
})