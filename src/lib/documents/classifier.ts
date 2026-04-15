import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

export type DocumentClassification = 'lab_test' | 'body_composition'

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

const NORMALIZED_KEYWORDS = BODY_COMPOSITION_KEYWORDS.map(normalizeText)

export function classifyDocument(structuredData: SanitizedMedicalDocument): DocumentClassification {
  const searchText = normalizeText(JSON.stringify(structuredData))
  const matchCount = NORMALIZED_KEYWORDS.filter((kw) => searchText.includes(kw)).length
  return matchCount >= THRESHOLD ? 'body_composition' : 'lab_test'
}
