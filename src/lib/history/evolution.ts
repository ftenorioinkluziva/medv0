import type { DocumentWithHistory } from '@/lib/db/queries/history'

export type ParameterEvolution = {
  name: string
  unit: string
  currentValue: number
  previousValue: number
  changePercent: number
  direction: 'up' | 'down' | 'stable'
}

const STABLE_THRESHOLD = 5

export function computeEvolution(
  current: DocumentWithHistory,
  previous: DocumentWithHistory | undefined,
): ParameterEvolution[] {
  if (!previous?.snapshot?.structuredData || !current.snapshot?.structuredData) {
    return []
  }

  const currentParams = current.snapshot.structuredData.modules
    .flatMap((m) => m.parameters)
    .filter((p): p is typeof p & { unit: string } => typeof p.unit === 'string' && p.unit.length > 0)

  const previousParamMap = new Map<string, number>()
  previous.snapshot.structuredData.modules
    .flatMap((m) => m.parameters)
    .filter((p): p is typeof p & { unit: string } => typeof p.unit === 'string' && p.unit.length > 0)
    .forEach((p) => {
      const numValue = typeof p.value === 'number' ? p.value : parseFloat(String(p.value))
      if (!isNaN(numValue)) {
        previousParamMap.set(`${p.name}||${p.unit}`, numValue)
      }
    })

  const evolutions: ParameterEvolution[] = []

  for (const param of currentParams) {
    const currentNum = typeof param.value === 'number' ? param.value : parseFloat(String(param.value))
    if (isNaN(currentNum)) continue

    const key = `${param.name}||${param.unit}`
    const prevNum = previousParamMap.get(key)
    if (prevNum === undefined || prevNum === 0) continue

    const changePercent = ((currentNum - prevNum) / Math.abs(prevNum)) * 100

    let direction: 'up' | 'down' | 'stable'
    const absChange = Math.abs(changePercent)
    if (absChange < STABLE_THRESHOLD) {
      direction = 'stable'
    } else if (changePercent > 0) {
      direction = 'up'
    } else {
      direction = 'down'
    }

    evolutions.push({
      name: param.name,
      unit: param.unit,
      currentValue: currentNum,
      previousValue: prevNum,
      changePercent,
      direction,
    })
  }

  return evolutions
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 3)
}
