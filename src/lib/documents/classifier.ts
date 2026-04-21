import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

export type DocumentClassification = 'bioimpedance' | 'blood_test' | 'other'

const BIOIMPEDANCE_KEYWORDS = [
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

const BLOOD_TEST_KEYWORDS = [
  'hemograma',
  'blood count',
  'glicose',
  'glucose',
  'colesterol',
  'cholesterol',
  'triglicerídeos',
  'triglycerides',
  'creatinina',
  'creatinine',
  'hemoglobina',
  'hemoglobin',
  'leucócitos',
  'leukocytes',
  'plaquetas',
  'platelets',
]

const THRESHOLD = 3

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

const NORMALIZED_BIOIMPEDANCE = BIOIMPEDANCE_KEYWORDS.map(normalizeText)
const NORMALIZED_BLOOD_TEST = BLOOD_TEST_KEYWORDS.map(normalizeText)

export function classifyDocument(structuredData: SanitizedMedicalDocument): DocumentClassification {
  const searchText = normalizeText(JSON.stringify(structuredData))
  if (NORMALIZED_BIOIMPEDANCE.filter((kw) => searchText.includes(kw)).length >= THRESHOLD) {
    return 'bioimpedance'
  }
  if (NORMALIZED_BLOOD_TEST.filter((kw) => searchText.includes(kw)).length >= THRESHOLD) {
    return 'blood_test'
  }
  return 'other'
}
