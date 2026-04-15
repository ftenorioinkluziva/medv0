import type React from 'react'
import { WorkoutPlanView } from './workout-plan-view'
import { NutritionPlanView } from './nutrition-plan-view'
import { SupplementPlanView } from './supplement-plan-view'
import { GenericStructuredView } from './generic-structured-view'
import {
  AGENT_NAME_WORKOUT,
  AGENT_NAME_NUTRITION,
  AGENT_NAME_SUPPLEMENT,
} from '@/lib/ai/agents/names'

const STRUCTURED_COMPONENTS: Record<string, React.ComponentType<{ data: unknown }>> = {
  [AGENT_NAME_WORKOUT]: WorkoutPlanView,
  [AGENT_NAME_NUTRITION]: NutritionPlanView,
  [AGENT_NAME_SUPPLEMENT]: SupplementPlanView,
}

export function getStructuredComponent(
  agentName: string,
): React.ComponentType<{ data: unknown }> {
  return STRUCTURED_COMPONENTS[agentName] ?? GenericStructuredView
}
