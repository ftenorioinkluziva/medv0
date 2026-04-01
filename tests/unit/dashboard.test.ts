import { describe, it, expect } from 'vitest'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'
import { extractAlteredMarkers } from '@/lib/dashboard/markers'

function makeDoc(params: Array<{ name: string; value: string; status: string }>): SanitizedMedicalDocument {
  return {
    documentType: 'Hemograma',
    overallSummary: 'Test',
    patientInfo: {},
    modules: [
      {
        moduleName: 'Módulo teste',
        category: 'hematology',
        status: 'abnormal',
        summary: '',
        parameters: params.map((p) => ({
          name: p.name,
          value: p.value,
          status: p.status as 'normal' | 'high' | 'low' | 'abnormal' | 'borderline' | 'n/a',
        })),
      },
    ],
  }
}

describe('extractAlteredMarkers', () => {
  it('filters out normal parameters', () => {
    // #given
    const doc = makeDoc([
      { name: 'Hemoglobina', value: '12', status: 'normal' },
      { name: 'Glicose', value: '130', status: 'high' },
      { name: 'TGO', value: '15', status: 'n/a' },
      { name: 'Ferritina', value: '5', status: 'low' },
    ])

    // #when
    const result = extractAlteredMarkers(doc)

    // #then
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.name)).toEqual(['Glicose', 'Ferritina'])
  })

  it('limits to MAX_ALTERED_MARKERS (8)', () => {
    // #given
    const params = Array.from({ length: 12 }, (_, i) => ({
      name: `Param ${i}`,
      value: `${i}`,
      status: 'high',
    }))
    const doc = makeDoc(params)

    // #when
    const result = extractAlteredMarkers(doc)

    // #then
    expect(result).toHaveLength(8)
  })

  it('returns empty array when no modules present', () => {
    // #given / #when
    const result = extractAlteredMarkers(null)

    // #then
    expect(result).toEqual([])
  })

  it('returns empty array when all parameters are normal', () => {
    // #given
    const doc = makeDoc([
      { name: 'Hemoglobina', value: '14', status: 'normal' },
      { name: 'Leucócitos', value: '7000', status: 'normal' },
    ])

    // #when
    const result = extractAlteredMarkers(doc)

    // #then
    expect(result).toHaveLength(0)
  })

  it('includes high, low, abnormal, and borderline statuses', () => {
    // #given
    const doc = makeDoc([
      { name: 'A', value: '1', status: 'high' },
      { name: 'B', value: '2', status: 'low' },
      { name: 'C', value: '3', status: 'abnormal' },
      { name: 'D', value: '4', status: 'borderline' },
      { name: 'E', value: '5', status: 'normal' },
    ])

    // #when
    const result = extractAlteredMarkers(doc)

    // #then
    expect(result).toHaveLength(4)
    expect(result.map((r) => r.status)).toEqual(['high', 'low', 'abnormal', 'borderline'])
  })

  it('does not mix markers from two independent structured data payloads', () => {
    // #given — two independent payloads (data shape isolation; DB-level userId
    // filtering is tested at the data-loading boundary in page.tsx, not here)
    const payload1 = makeDoc([{ name: 'Glicose', value: '200', status: 'high' }])
    const payload2 = makeDoc([{ name: 'Colesterol', value: '220', status: 'abnormal' }])

    // #when
    const result1 = extractAlteredMarkers(payload1)
    const result2 = extractAlteredMarkers(payload2)

    // #then
    expect(result1.map((r) => r.name)).toContain('Glicose')
    expect(result1.map((r) => r.name)).not.toContain('Colesterol')
    expect(result2.map((r) => r.name)).toContain('Colesterol')
    expect(result2.map((r) => r.name)).not.toContain('Glicose')
  })

  it('handles undefined status as not altered', () => {
    // #given
    const doc: SanitizedMedicalDocument = {
      documentType: 'Test',
      overallSummary: '',
      patientInfo: {},
      modules: [
        {
          moduleName: 'M',
          category: 'test',
          status: 'normal',
          summary: '',
          parameters: [{ name: 'Param', value: '1' }],
        },
      ],
    }

    // #when
    const result = extractAlteredMarkers(doc)

    // #then
    expect(result).toHaveLength(0)
  })

  it('flattens parameters across multiple modules', () => {
    // #given
    const doc: SanitizedMedicalDocument = {
      documentType: 'Multi',
      overallSummary: '',
      patientInfo: {},
      modules: [
        {
          moduleName: 'Módulo 1',
          category: 'A',
          status: 'high',
          summary: '',
          parameters: [{ name: 'P1', value: '1', status: 'high' }],
        },
        {
          moduleName: 'Módulo 2',
          category: 'B',
          status: 'low',
          summary: '',
          parameters: [{ name: 'P2', value: '2', status: 'low' }],
        },
      ],
    }

    // #when
    const result = extractAlteredMarkers(doc)

    // #then
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.name)).toEqual(['P1', 'P2'])
  })
})
