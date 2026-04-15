import { describe, it, expect } from 'vitest'
import { classifyDocument } from '@/lib/documents/classifier'
import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

const BASE_DOC: SanitizedMedicalDocument = {
  documentType: 'Exame',
  overallSummary: 'Resumo',
  patientInfo: {},
  modules: [],
}

function makeDoc(overrides: Partial<SanitizedMedicalDocument>): SanitizedMedicalDocument {
  return { ...BASE_DOC, ...overrides }
}

describe('classifyDocument', () => {
  describe('body_composition detection', () => {
    it('classifica como body_composition quando ≥3 keywords estão presentes', () => {
      // #given
      const doc = makeDoc({
        modules: [
          {
            moduleName: 'Composição',
            category: 'Bioimpedância',
            status: 'normal',
            summary: 'ok',
            parameters: [
              { name: 'Gordura Corporal %', value: 25 },
              { name: 'Massa Muscular (kg)', value: 35 },
              { name: 'Gordura Visceral', value: 8 },
            ],
          },
        ],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('body_composition')
    })

    it('classifica como body_composition com keywords em inglês', () => {
      // #given
      const doc = makeDoc({
        documentType: 'Body Composition Analysis',
        modules: [
          {
            moduleName: 'Composition',
            category: 'Analysis',
            status: 'normal',
            summary: 'ok',
            parameters: [
              { name: 'Body Fat %', value: 20 },
              { name: 'Muscle Mass', value: 40 },
              { name: 'Visceral Fat', value: 6 },
            ],
          },
        ],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('body_composition')
    })

    it('classifica como body_composition com todos os parâmetros típicos de bioimpedância', () => {
      // #given
      const doc = makeDoc({
        documentType: 'Bioimpedância',
        modules: [
          {
            moduleName: 'Resultados',
            category: 'Bioimpedância',
            status: 'normal',
            summary: 'ok',
            parameters: [
              { name: 'Taxa Metabólica Basal', value: 1600 },
              { name: 'Água Corporal %', value: 55 },
              { name: 'Massa Óssea', value: 2.8 },
            ],
          },
        ],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('body_composition')
    })
  })

  describe('lab_test detection (fallback)', () => {
    it('classifica como lab_test para exame de sangue típico', () => {
      // #given
      const doc = makeDoc({
        documentType: 'Hemograma Completo',
        modules: [
          {
            moduleName: 'Eritrograma',
            category: 'Hematologia',
            status: 'normal',
            summary: 'Valores normais',
            parameters: [
              { name: 'Hemoglobina', value: 14.5, unit: 'g/dL' },
              { name: 'Glicose', value: 90, unit: 'mg/dL' },
              { name: 'TSH', value: 2.1, unit: 'mUI/L' },
            ],
          },
        ],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('lab_test')
    })

    it('classifica como lab_test quando menos de 3 keywords de composição corporal são encontradas', () => {
      // #given — apenas 2 keywords, abaixo do threshold
      const doc = makeDoc({
        modules: [
          {
            moduleName: 'Dados',
            category: 'Bioquímica',
            status: 'normal',
            summary: 'ok',
            parameters: [
              { name: 'Gordura Corporal %', value: 20 },
              { name: 'Colesterol Total', value: 180 },
            ],
          },
        ],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('lab_test')
    })

    it('classifica como lab_test para documento ambíguo (fallback seguro)', () => {
      // #given — sem keywords de composição corporal
      const doc = makeDoc({
        documentType: 'UNKNOWN',
        overallSummary: 'Documento sem classificação clara',
        modules: [],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('lab_test')
    })
  })
})
