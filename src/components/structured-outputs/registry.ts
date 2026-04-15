import type React from 'react'
import { WorkoutPlanView } from './workout-plan-view'
import { NutritionPlanView } from './nutrition-plan-view'
import { SupplementPlanView } from './supplement-plan-view'
import { GenericStructuredView } from './generic-structured-view'

const STRUCTURED_COMPONENTS: Record<string, React.ComponentType<{ data: unknown }>> = {
  'Plano de Exercícios': WorkoutPlanView,
  'Plano Alimentar': NutritionPlanView,
  'Plano de Suplementação': SupplementPlanView,
}

export function getStructuredComponent(
  agentName: string,
): React.ComponentType<{ data: unknown }> {
  return STRUCTURED_COMPONENTS[agentName] ?? GenericStructuredView
}
