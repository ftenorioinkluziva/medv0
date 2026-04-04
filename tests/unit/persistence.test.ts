import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

// Mock db before importing persistence
const mockReturning = vi.fn()
const mockDocumentValues = vi.fn()
const mockSnapshotValues = vi.fn()
const mockDeleteWhere = vi.fn()
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }))

const mockInsert = vi.fn()

vi.mock('@/lib/db/client', () => ({
  db: {
    insert: mockInsert,
    delete: mockDelete,
  },
}))

vi.mock('@/lib/db/schema', () => ({
  documents: { id: 'documents.id' },
  snapshots: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'documents.id = doc-id'),
}))

const { persistSnapshot, persistFailedDocument } = await import('@/lib/documents/persistence')
const { db } = await import('@/lib/db/client')

const VALID_DOCUMENT: SanitizedMedicalDocument = {
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

describe('persistSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert
      .mockReturnValueOnce({ values: mockDocumentValues })
      .mockReturnValueOnce({ values: mockSnapshotValues })
    mockDelete.mockReturnValue({ where: mockDeleteWhere })
    mockDocumentValues.mockReturnValue({ returning: mockReturning })
    mockReturning.mockResolvedValue([{ id: 'doc-uuid-123' }])
    mockSnapshotValues.mockResolvedValue(undefined)
  })

  describe('successful persistence', () => {
    it('should return documentId after successful transaction', async () => {
      // #given
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'hemograma.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when
      const result = await persistSnapshot(input)

      // #then
      expect(result).toEqual({ documentId: 'doc-uuid-123' })
    })

    it('should insert document with correct fields', async () => {
      // #given
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when
      await persistSnapshot(input)

      // #then
      const insertValues = mockDocumentValues.mock.calls[0][0] as Record<string, unknown>
      expect(insertValues.userId).toBe('user-uuid-abc')
      expect(insertValues.originalFileName).toBe('exame.pdf')
      expect(insertValues.documentType).toBe('Hemograma Completo')
      expect(insertValues.processingStatus).toBe('completed')
      expect(insertValues.overallSummary).toBe('Exame dentro dos parâmetros normais.')
    })

    it('should insert document with examDate from structuredData', async () => {
      // #given
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when
      await persistSnapshot(input)

      // #then
      const insertValues = mockDocumentValues.mock.calls[0][0] as Record<string, unknown>
      expect(insertValues.examDate).toBe('2024-01-15')
    })

    it('should set examDate to null when not present in structuredData', async () => {
      // #given
      const docWithoutDate: SanitizedMedicalDocument = { ...VALID_DOCUMENT, examDate: undefined }
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: docWithoutDate,
      }

      // #when
      await persistSnapshot(input)

      // #then
      const insertValues = mockDocumentValues.mock.calls[0][0] as Record<string, unknown>
      expect(insertValues.examDate).toBeNull()
    })

    it('should insert snapshot with complete structuredData', async () => {
      // #given
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when
      await persistSnapshot(input)

      // #then
      const snapshotValues = mockSnapshotValues.mock.calls[0][0] as Record<string, unknown>
      expect(snapshotValues.documentId).toBe('doc-uuid-123')
      expect(snapshotValues.userId).toBe('user-uuid-abc')
      expect(snapshotValues.structuredData).toEqual(VALID_DOCUMENT)
    })

    it('should run both inserts sequentially', async () => {
      // #given
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when
      await persistSnapshot(input)

      // #then
      expect(vi.mocked(db).insert).toHaveBeenCalledTimes(2)
    })
  })

  describe('user isolation', () => {
    it('should propagate userId to both documents and snapshots', async () => {
      // #given
      const input = {
        userId: 'specific-user-id',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when
      await persistSnapshot(input)

      // #then
      const documentInsertValues = mockDocumentValues.mock.calls[0][0] as Record<string, unknown>
      const snapshotInsertValues = mockSnapshotValues.mock.calls[0][0] as Record<string, unknown>
      expect(documentInsertValues.userId).toBe('specific-user-id')
      expect(snapshotInsertValues.userId).toBe('specific-user-id')
    })
  })

  describe('error handling', () => {
    it('should propagate error when document insert fails', async () => {
      // #given
      mockInsert.mockReset()
      vi.mocked(db).insert.mockImplementationOnce(() => {
        throw new Error('DB connection failed')
      })
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when / #then
      await expect(persistSnapshot(input)).rejects.toThrow('DB connection failed')
    })

    it('should propagate error when snapshot insert fails and cleanup document', async () => {
      // #given
      mockInsert
        .mockReset()
        .mockReturnValueOnce({ values: mockDocumentValues })
        .mockReturnValueOnce({ values: mockSnapshotValues })
      mockReturning.mockResolvedValueOnce([{ id: 'doc-id' }])
      mockDocumentValues.mockReturnValueOnce({ returning: mockReturning })
      mockSnapshotValues.mockRejectedValueOnce(new Error('Snapshot insert failed'))
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when / #then
      await expect(persistSnapshot(input)).rejects.toThrow('Snapshot insert failed')
      expect(vi.mocked(db).delete).toHaveBeenCalledOnce()
      expect(mockDeleteWhere).toHaveBeenCalledOnce()
    })
  })

  describe('extractedAt timestamp', () => {
    it('should set extractedAt to a Date instance', async () => {
      // #given
      const before = new Date()
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when
      await persistSnapshot(input)

      // #then
      const after = new Date()
      const insertValues = mockDocumentValues.mock.calls[0][0] as Record<string, unknown>
      expect(insertValues.extractedAt).toBeInstanceOf(Date)
      const extractedAt = insertValues.extractedAt as Date
      expect(extractedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(extractedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('failed extraction persistence', () => {
    it('should persist failed document without creating snapshot', async () => {
      // #given
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'falho.pdf',
        structuredData: {
          documentType: 'UNKNOWN',
          overallSummary: 'Não foi possível extrair os dados',
          patientInfo: {},
          modules: [],
        },
        processingError: 'Não foi possível extrair dados utilizáveis do documento enviado.',
      }

      // #when
      const result = await persistFailedDocument(input)

      // #then
      expect(result).toEqual({ documentId: 'doc-uuid-123' })
      expect(vi.mocked(db).insert).toHaveBeenCalledTimes(1)
      const insertValues = mockDocumentValues.mock.calls[0][0] as Record<string, unknown>
      expect(insertValues.processingStatus).toBe('failed')
      expect(insertValues.processingError).toBe(input.processingError)
      expect(mockSnapshotValues).not.toHaveBeenCalled()
    })
  })
})
