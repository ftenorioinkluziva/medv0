import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

export type DocumentClassification = 'body_composition' | 'lab_test' | 'other'

const BODY_COMPOSITION_KEYWORDS = [
  'gordura corporal',
  'body fat',
  'massa muscular',
  'muscle mass',
  'gordura visceral',
  'visceral fat',
  'massa óssea',
  'bone mass',
  'taxa metabólica basal',
  'basal metabolic',
  'água corporal',
  'body water',
  'bioimpedância',
  'bioimpedance',
]

const THRESHOLD = 3

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

const NORMALIZED_BODY_COMPOSITION = BODY_COMPOSITION_KEYWORDS.map(normalizeText)

export function classifyDocument(structuredData: SanitizedMedicalDocument): DocumentClassification {
  const searchText = normalizeText(JSON.stringify(structuredData))
  if (NORMALIZED_BODY_COMPOSITION.filter((kw) => searchText.includes(kw)).length >= THRESHOLD) {
    return 'body_composition'
  }
  return 'lab_test'
}
