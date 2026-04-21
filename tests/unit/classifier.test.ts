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
  describe('bioimpedance detection', () => {
    it('classifica como bioimpedance quando ≥3 keywords estão presentes', () => {
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
      expect(result).toBe('bioimpedance')
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
      expect(result).toBe('bioimpedance')
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
      expect(result).toBe('bioimpedance')
    })
  })

  describe('blood_test detection', () => {
    it('classifica como blood_test para exame de sangue típico com ≥3 keywords', () => {
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
              { name: 'Colesterol Total', value: 180, unit: 'mg/dL' },
            ],
          },
        ],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('blood_test')
    })

    it('classifica como blood_test quando keywords de lab superam bioimpedance', () => {
      // #given — 1 bioimpedance keyword, 3 lab keywords → lab wins
      const doc = makeDoc({
        modules: [
          {
            moduleName: 'Bioquímica',
            category: 'Laboratório',
            status: 'normal',
            summary: 'ok',
            parameters: [
              { name: 'Gordura Corporal %', value: 20 },
              { name: 'Hemoglobina', value: 14.5 },
              { name: 'Creatinina', value: 1.0 },
              { name: 'Colesterol', value: 180 },
            ],
          },
        ],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('blood_test')
    })
  })

  describe('other detection', () => {
    it('classifica como other quando menos de 3 keywords de qualquer categoria são encontradas', () => {
      // #given — 1 body comp keyword, 1 lab keyword, ambos abaixo do threshold
      const doc = makeDoc({
        modules: [
          {
            moduleName: 'Dados',
            category: 'Bioquímica',
            status: 'normal',
            summary: 'ok',
            parameters: [
              { name: 'Gordura Corporal %', value: 20 },
              { name: 'TSH', value: 2.1 },
            ],
          },
        ],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('other')
    })

    it('classifica como other para documento ambíguo sem keywords reconhecíveis', () => {
      // #given
      const doc = makeDoc({
        documentType: 'UNKNOWN',
        overallSummary: 'Documento sem classificação clara',
        modules: [],
      })

      // #when
      const result = classifyDocument(doc)

      // #then
      expect(result).toBe('other')
    })
  })
})
