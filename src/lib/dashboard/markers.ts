import type { SanitizedMedicalDocument } from '@/lib/documents/extractor'

export type AlteredMarker = {
  name: string
  value: string | number
  unit?: string
  status?: string
}

const MAX_ALTERED_MARKERS = 8
const NORMAL_STATUSES = new Set(['normal', 'n/a'])

export function extractAlteredMarkers(
  structuredData: SanitizedMedicalDocument | null,
): AlteredMarker[] {
  if (!structuredData?.modules) return []

  return structuredData.modules
    .flatMap((m) => m.parameters ?? [])
    .filter((p) => p.status != null && !NORMAL_STATUSES.has(p.status))
    .slice(0, MAX_ALTERED_MARKERS)
    .map((p) => ({
      name: p.name,
      value: p.value,
      unit: p.unit,
      status: p.status,
    }))
}
