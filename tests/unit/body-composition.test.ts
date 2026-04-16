import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockEq = vi.fn((col, val) => ({ col, val }))

vi.mock('@/lib/db/client', () => ({
  db: {
    update: mockUpdate,
    insert: mockInsert,
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: mockEq,
}))

vi.mock('@/lib/db/schema', () => ({
  medicalProfiles: { userId: 'medicalProfiles.userId' },
  bodyCompositionHistory: {},
}))

const { extractBodyCompositionMetrics, updateBodyComposition } = await import(
  '@/lib/documents/body-composition'
)

function makeDoc(params: Array<{ name: string; value: string | number }>): SanitizedMedicalDocument {
  return {
    documentType: 'Bioimpedância',
    overallSummary: 'Composição corporal',
    patientInfo: {},
    modules: [
      {
        moduleName: 'Resultados',
        category: 'Bioimpedância',
        status: 'normal',
        summary: 'ok',
        parameters: params,
      },
    ],
  }
}

describe('extractBodyCompositionMetrics', () => {
  it('extrai percentual de gordura com unidade %', () => {
    // #given
    const doc = makeDoc([{ name: 'Gordura Corporal', value: '25.3%' }])

    // #when
    const result = extractBodyCompositionMetrics(doc)

    // #then
    expect(result.bodyFat).toBe(25.3)
  })

  it('extrai massa muscular com unidade kg', () => {
    // #given
    const doc = makeDoc([{ name: 'Massa Muscular', value: '54.2 kg' }])

    // #when
    const result = extractBodyCompositionMetrics(doc)

    // #then
    expect(result.muscleMass).toBe(54.2)
  })

  it('extrai TMB com valor com separador de milhar', () => {
    // #given
    const doc = makeDoc([{ name: 'Taxa Metabólica Basal', value: '1.430 kcal' }])

    // #when
    const result = extractBodyCompositionMetrics(doc)

    // #then
    expect(result.bmr).toBe(1430)
  })

  it('extrai peso como número direto', () => {
    // #given
    const doc = makeDoc([{ name: 'Peso', value: 72 }])

    // #when
    const result = extractBodyCompositionMetrics(doc)

    // #then
    expect(result.weight).toBe(72)
  })

  it('usa examDate como measuredAt quando disponível', () => {
    // #given
    const doc = makeDoc([])
    doc.examDate = '2026-03-15'

    // #when
    const result = extractBodyCompositionMetrics(doc)

    // #then
    expect(result.measuredAt).toBe('2026-03-15')
  })

  it('retorna objeto vazio quando sem parâmetros reconhecidos', () => {
    // #given
    const doc = makeDoc([{ name: 'Parâmetro Desconhecido', value: 42 }])

    // #when
    const result = extractBodyCompositionMetrics(doc)

    // #then
    expect(result.bodyFat).toBeUndefined()
    expect(result.muscleMass).toBeUndefined()
    expect(result.weight).toBeUndefined()
  })

  it('extrai múltiplos campos em um único documento', () => {
    // #given
    const doc = makeDoc([
      { name: 'Gordura Corporal', value: '28.5%' },
      { name: 'Massa Muscular', value: '42.1 kg' },
      { name: 'Gordura Visceral', value: '9' },
      { name: 'Massa Óssea', value: '2.8 kg' },
      { name: 'TMB', value: '1.380 kcal' },
      { name: 'Água Corporal', value: '52.3%' },
      { name: 'Peso', value: '75.0 kg' },
    ])

    // #when
    const result = extractBodyCompositionMetrics(doc)

    // #then
    expect(result.bodyFat).toBe(28.5)
    expect(result.muscleMass).toBe(42.1)
    expect(result.visceralFat).toBe(9)
    expect(result.boneMass).toBe(2.8)
    expect(result.bmr).toBe(1380)
    expect(result.bodyWater).toBe(52.3)
    expect(result.weight).toBe(75)
  })
})

// ---------------------------------------------------------------------------
// calculateDelta — pure function, no mocks needed
// ---------------------------------------------------------------------------

// Import separately to avoid DB module side-effects from the mock above
const { calculateDelta } = await import('@/lib/db/queries/body-composition')

describe('calculateDelta', () => {
  it('retorna null quando current é null', () => {
    // #given / #when / #then
    expect(calculateDelta(null, 70)).toBeNull()
  })

  it('retorna null quando previous é null', () => {
    // #given / #when / #then
    expect(calculateDelta(70, null)).toBeNull()
  })

  it('retorna null quando ambos são null', () => {
    // #given / #when / #then
    expect(calculateDelta(null, null)).toBeNull()
  })

  it('retorna "estável" quando diff absoluta < 1', () => {
    // #given
    const current = 70.5
    const previous = 70.0 // diff = 0.5 < 1

    // #when
    const result = calculateDelta(current, previous)

    // #then
    expect(result).toBe('estável')
  })

  it('retorna "estável" para diff exatamente 0', () => {
    // #given / #when / #then
    expect(calculateDelta(72.5, 72.5)).toBe('estável')
  })

  it('retorna "estável" para diff negativa < 1 em módulo', () => {
    // #given / #when / #then
    expect(calculateDelta(69.5, 70.0)).toBe('estável') // diff = -0.5
  })

  it('retorna ↑ quando current > previous por >= 1', () => {
    // #given
    const current = 75.0
    const previous = 73.0 // diff = +2.0

    // #when
    const result = calculateDelta(current, previous)

    // #then
    expect(result).toBe('↑ 2.0')
  })

  it('retorna ↓ quando current < previous por >= 1', () => {
    // #given
    const current = 22.0
    const previous = 24.3 // diff = -2.3

    // #when
    const result = calculateDelta(current, previous)

    // #then
    expect(result).toBe('↓ 2.3')
  })

  it('formata diff com 1 casa decimal', () => {
    // #given
    const current = 55.35
    const previous = 53.0 // diff = 2.35

    // #when
    const result = calculateDelta(current, previous)

    // #then
    expect(result).toMatch(/↑ \d+\.\d$/)
  })
})

describe('updateBodyComposition', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    }
    mockUpdate.mockReturnValue(updateChain)

    const insertChain = {
      values: vi.fn().mockResolvedValue(undefined),
    }
    mockInsert.mockReturnValue(insertChain)
  })

  it('atualiza medical_profiles e insere histórico', async () => {
    // #given
    const doc = makeDoc([
      { name: 'Gordura Corporal', value: '25%' },
      { name: 'Massa Muscular', value: '50 kg' },
    ])

    // #when
    await updateBodyComposition('user-1', 'doc-1', doc)

    // #then
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockInsert).toHaveBeenCalledOnce()
  })

  it('insere histórico mesmo quando perfil não tem campos para atualizar', async () => {
    // #given
    const doc = makeDoc([])

    // #when
    await updateBodyComposition('user-1', 'doc-1', doc)

    // #then
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledOnce()
  })

  it('usa hoje como measuredAt quando examDate ausente', async () => {
    // #given
    const doc = makeDoc([{ name: 'Peso', value: 70 }])
    const today = new Date().toISOString().split('T')[0]

    const insertChain = {
      values: vi.fn().mockResolvedValue(undefined),
    }
    mockInsert.mockReturnValue(insertChain)

    // #when
    await updateBodyComposition('user-1', 'doc-1', doc)

    // #then
    const insertedValues = insertChain.values.mock.calls[0][0]
    expect(insertedValues.measuredAt).toBe(today)
  })
})
