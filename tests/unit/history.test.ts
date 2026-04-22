import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { computeEvolution } from '@/lib/history/evolution'
import { db } from '@/lib/db/client'
import { getDocumentsWithHistory } from '@/lib/db/queries/history'
import type { DocumentWithHistory } from '@/lib/db/queries/history'

function makeDoc(
  overrides: Partial<DocumentWithHistory> & { id: string },
): DocumentWithHistory {
  return {
    documentType: 'Hemograma',
    originalFileName: 'exam.pdf',
    examDate: '2026-01-01',
    createdAt: new Date('2026-01-01'),
    processingStatus: 'completed',
    category: null,
    snapshot: null,
    livingAnalysis: null,
    ...overrides,
  }
}

const makeSnapshot = (params: { name: string; value: number; unit: string }[]) => ({
  structuredData: {
    documentType: 'Hemograma',
    overallSummary: '',
    patientInfo: {},
    modules: [
      {
        moduleName: 'Lipidograma',
        category: 'Lipídios',
        status: 'normal' as const,
        summary: '',
        parameters: params.map((p) => ({
          name: p.name,
          value: p.value,
          unit: p.unit,
          status: 'normal' as const,
        })),
      },
    ],
  },
})

describe('computeEvolution', () => {
  it('retorna [] quando não há exame anterior', () => {
    // #given
    const current = makeDoc({ id: 'doc-1', snapshot: makeSnapshot([{ name: 'LDL', value: 120, unit: 'mg/dL' }]) })

    // #when
    const result = computeEvolution(current, undefined)

    // #then
    expect(result).toEqual([])
  })

  it('retorna [] quando exame anterior não tem snapshot', () => {
    // #given
    const current = makeDoc({ id: 'doc-1', snapshot: makeSnapshot([{ name: 'LDL', value: 120, unit: 'mg/dL' }]) })
    const previous = makeDoc({ id: 'doc-0', snapshot: null })

    // #when
    const result = computeEvolution(current, previous)

    // #then
    expect(result).toEqual([])
  })

  it('classifica variação >= 5% como up quando valor aumentou', () => {
    // #given
    const previous = makeDoc({ id: 'doc-0', snapshot: makeSnapshot([{ name: 'LDL', value: 100, unit: 'mg/dL' }]) })
    const current = makeDoc({ id: 'doc-1', snapshot: makeSnapshot([{ name: 'LDL', value: 120, unit: 'mg/dL' }]) })

    // #when
    const result = computeEvolution(current, previous)

    // #then
    expect(result).toHaveLength(1)
    expect(result[0].direction).toBe('up')
    expect(result[0].changePercent).toBeCloseTo(20)
  })

  it('classifica variação >= 5% como down quando valor diminuiu', () => {
    // #given
    const previous = makeDoc({ id: 'doc-0', snapshot: makeSnapshot([{ name: 'Glicemia', value: 100, unit: 'mg/dL' }]) })
    const current = makeDoc({ id: 'doc-1', snapshot: makeSnapshot([{ name: 'Glicemia', value: 85, unit: 'mg/dL' }]) })

    // #when
    const result = computeEvolution(current, previous)

    // #then
    expect(result).toHaveLength(1)
    expect(result[0].direction).toBe('down')
    expect(result[0].changePercent).toBeCloseTo(-15)
  })

  it('classifica variação < 5% como stable', () => {
    // #given
    const previous = makeDoc({ id: 'doc-0', snapshot: makeSnapshot([{ name: 'LDL', value: 100, unit: 'mg/dL' }]) })
    const current = makeDoc({ id: 'doc-1', snapshot: makeSnapshot([{ name: 'LDL', value: 103, unit: 'mg/dL' }]) })

    // #when
    const result = computeEvolution(current, previous)

    // #then
    expect(result).toHaveLength(1)
    expect(result[0].direction).toBe('stable')
  })

  it('ignora parâmetros com unidades diferentes', () => {
    // #given
    const previous = makeDoc({
      id: 'doc-0',
      snapshot: makeSnapshot([{ name: 'TSH', value: 2.5, unit: 'mIU/L' }]),
    })
    const current = makeDoc({
      id: 'doc-1',
      snapshot: makeSnapshot([{ name: 'TSH', value: 3.0, unit: 'uIU/mL' }]),
    })

    // #when
    const result = computeEvolution(current, previous)

    // #then
    expect(result).toEqual([])
  })

  it('retorna no máximo 3 biomarcadores ordenados por maior variação absoluta', () => {
    // #given
    const prevParams = [
      { name: 'A', value: 100, unit: 'mg/dL' },
      { name: 'B', value: 100, unit: 'mg/dL' },
      { name: 'C', value: 100, unit: 'mg/dL' },
      { name: 'D', value: 100, unit: 'mg/dL' },
    ]
    const currParams = [
      { name: 'A', value: 110, unit: 'mg/dL' }, // +10%
      { name: 'B', value: 130, unit: 'mg/dL' }, // +30%
      { name: 'C', value: 150, unit: 'mg/dL' }, // +50%
      { name: 'D', value: 120, unit: 'mg/dL' }, // +20%
    ]
    const previous = makeDoc({ id: 'doc-0', snapshot: makeSnapshot(prevParams) })
    const current = makeDoc({ id: 'doc-1', snapshot: makeSnapshot(currParams) })

    // #when
    const result = computeEvolution(current, previous)

    // #then
    expect(result).toHaveLength(3)
    expect(result[0].name).toBe('C')
    expect(result[1].name).toBe('B')
    expect(result[2].name).toBe('D')
  })
})

describe('getDocumentsWithHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna lista vazia quando usuário não tem documentos', async () => {
    // #given
    const livingChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    const docsChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select)
      .mockReturnValueOnce(livingChain as never)
      .mockReturnValueOnce(docsChain as never)

    // #when
    const result = await getDocumentsWithHistory('user-1')

    // #then
    expect(result).toEqual([])
  })

  it('mapeia snapshot e livingAnalysis corretamente', async () => {
    // #given
    const structuredData = { documentType: 'Hemograma', overallSummary: '', patientInfo: {}, modules: [] }
    const docRow = {
      id: 'doc-1',
      documentType: 'Hemograma',
      originalFileName: 'exam.pdf',
      examDate: '2026-01-01',
      createdAt: new Date('2026-01-01'),
      processingStatus: 'completed',
      snapshotStructuredData: structuredData,
    }
    const livingRow = {
      id: 'living-1',
      status: 'completed',
      updatedAt: new Date('2026-01-02'),
    }
    const livingChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([livingRow]),
    }
    const currentVersionChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ triggerDocumentId: 'doc-1' }]),
    }
    const docsChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([docRow]),
    }
    vi.mocked(db.select)
      .mockReturnValueOnce(livingChain as never)
      .mockReturnValueOnce(currentVersionChain as never)
      .mockReturnValueOnce(docsChain as never)

    // #when
    const result = await getDocumentsWithHistory('user-1')

    // #then
    expect(result).toHaveLength(1)
    expect(result[0].snapshot).toEqual({ structuredData })
    expect(result[0].livingAnalysis).toEqual({
      id: 'living-1',
      status: 'completed',
      updatedAt: new Date('2026-01-02'),
      currentTriggerDocumentId: 'doc-1',
    })
  })

  it('mapeia null quando não há snapshot nem análise', async () => {
    // #given
    const row = {
      id: 'doc-2',
      documentType: 'Raio-X',
      originalFileName: 'rx.pdf',
      examDate: null,
      createdAt: new Date('2026-01-05'),
      processingStatus: 'completed',
      snapshotStructuredData: null,
    }
    const livingChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    const docsChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([row]),
    }
    vi.mocked(db.select)
      .mockReturnValueOnce(livingChain as never)
      .mockReturnValueOnce(docsChain as never)

    // #when
    const result = await getDocumentsWithHistory('user-1')

    // #then
    expect(result[0].snapshot).toBeNull()
    expect(result[0].livingAnalysis).toBeNull()
  })
})
