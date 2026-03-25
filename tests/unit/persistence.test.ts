import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

// Mock db before importing persistence
const mockInsert = vi.fn()
const mockReturning = vi.fn()
const mockValues = vi.fn()

const mockTx = {
  insert: vi.fn(() => ({ values: mockValues })),
}

mockValues.mockReturnValue({ returning: mockReturning })

vi.mock('@/lib/db/client', () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  documents: { id: 'documents.id' },
  snapshots: {},
}))

const { persistSnapshot } = await import('@/lib/documents/persistence')
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
    mockTx.insert.mockReturnValue({ values: mockValues })
    mockValues.mockReturnValue({ returning: mockReturning })
    mockReturning.mockResolvedValue([{ id: 'doc-uuid-123' }])
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
      const insertValues = mockValues.mock.calls[0][0] as Record<string, unknown>
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
      const insertValues = mockValues.mock.calls[0][0] as Record<string, unknown>
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
      const insertValues = mockValues.mock.calls[0][0] as Record<string, unknown>
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
      const snapshotValues = mockValues.mock.calls[1][0] as Record<string, unknown>
      expect(snapshotValues.documentId).toBe('doc-uuid-123')
      expect(snapshotValues.userId).toBe('user-uuid-abc')
      expect(snapshotValues.structuredData).toEqual(VALID_DOCUMENT)
    })

    it('should run both inserts inside a single transaction', async () => {
      // #given
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when
      await persistSnapshot(input)

      // #then
      expect(vi.mocked(db).transaction).toHaveBeenCalledOnce()
      expect(mockTx.insert).toHaveBeenCalledTimes(2)
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
      const documentInsertValues = mockValues.mock.calls[0][0] as Record<string, unknown>
      const snapshotInsertValues = mockValues.mock.calls[1][0] as Record<string, unknown>
      expect(documentInsertValues.userId).toBe('specific-user-id')
      expect(snapshotInsertValues.userId).toBe('specific-user-id')
    })
  })

  describe('rollback on failure', () => {
    it('should propagate error when transaction fails', async () => {
      // #given
      vi.mocked(db).transaction.mockRejectedValueOnce(new Error('DB connection failed'))
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when / #then
      await expect(persistSnapshot(input)).rejects.toThrow('DB connection failed')
    })

    it('should propagate error when snapshot insert fails', async () => {
      // #given
      vi.mocked(db).transaction.mockImplementationOnce(async (fn) => {
        const failingTx = {
          insert: vi.fn().mockReturnValueOnce({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'doc-id' }]),
            }),
          }).mockReturnValueOnce({
            values: vi.fn().mockRejectedValue(new Error('Snapshot insert failed')),
          }),
        }
        return fn(failingTx as never)
      })
      const input = {
        userId: 'user-uuid-abc',
        fileName: 'exame.pdf',
        structuredData: VALID_DOCUMENT,
      }

      // #when / #then
      await expect(persistSnapshot(input)).rejects.toThrow('Snapshot insert failed')
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
      const insertValues = mockValues.mock.calls[0][0] as Record<string, unknown>
      expect(insertValues.extractedAt).toBeInstanceOf(Date)
      const extractedAt = insertValues.extractedAt as Date
      expect(extractedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(extractedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })
})
