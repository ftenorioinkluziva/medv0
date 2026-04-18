import type { HealthAgent } from '@/lib/db/schema'

/**
 * Keywords used to detect exercise/sports medicine agents by specialty string.
 * The system prompt for these agents defines a structured F.I.T.T. prescription
 * format that conflicts with the generic analysis prompt format, so they receive
 * a delegating prompt instead of an overriding one.
 */
const EXERCISE_SPECIALTY_KEYWORDS = [
  'exercício',
  'esportiva',
  'fisiologia do exercício',
  'medicina esportiva',
]

const NUTRITION_SPECIALTY_KEYWORDS = [
  'nutrição',
  'nutricional',
  'dietética',
  'bioquímica nutricional',
]

const CARDIOLOGY_SPECIALTY_KEYWORDS = [
  'cardiologia',
  'cardiovascular',
  'cardíaca',
]

const ENDOCRINOLOGY_SPECIALTY_KEYWORDS = [
  'endocrinologia',
  'hormonal',
  'tireoidiana',
  'metabólica',
]

const NEUROSCIENCE_SPECIALTY_KEYWORDS = [
  'neurociência',
  'neurocientista',
  'sono',
  'comportamento',
  'neuro',
]

function matchesKeywords(specialty: string, keywords: string[]): boolean {
  const lower = specialty.toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

export interface AgentPromptContext {
  /** Generic base prompt defined by the orchestrator (living or complete analysis) */
  basePrompt: string
  /** Whether this is a living analysis (continuous/delta-focused) */
  isLivingAnalysis?: boolean
}

/**
 * Returns the analysis prompt most appropriate for the given agent's specialty.
 *
 * For agents whose system prompt defines a rigid output format (e.g., exercise
 * prescription with F.I.T.T. tables), the base prompt would override that format.
 * These agents instead receive a prompt that defers to their system prompt structure
 * while still injecting the required analysis context and constraints.
 *
 * For foundation/generic agents, the base prompt is returned unchanged.
 */
export function resolveAgentPrompt(agent: HealthAgent, ctx: AgentPromptContext): string {
  const specialty = agent.specialty ?? ''

  if (matchesKeywords(specialty, EXERCISE_SPECIALTY_KEYWORDS)) {
    return buildExercisePrompt(ctx.isLivingAnalysis ?? false)
  }

  if (matchesKeywords(specialty, NUTRITION_SPECIALTY_KEYWORDS)) {
    return buildNutritionPrompt(ctx.isLivingAnalysis ?? false)
  }

  if (matchesKeywords(specialty, CARDIOLOGY_SPECIALTY_KEYWORDS)) {
    return buildCardiologyPrompt(ctx.isLivingAnalysis ?? false)
  }

  if (matchesKeywords(specialty, ENDOCRINOLOGY_SPECIALTY_KEYWORDS)) {
    return buildEndocrinologyPrompt(ctx.isLivingAnalysis ?? false)
  }

  if (matchesKeywords(specialty, NEUROSCIENCE_SPECIALTY_KEYWORDS)) {
    return buildNeurosciencePrompt(ctx.isLivingAnalysis ?? false)
  }

  // Foundation agents and unrecognized specialties use the base prompt unchanged.
  return ctx.basePrompt
}

// ---------------------------------------------------------------------------
// Specialized prompts — each defers to the agent's system prompt format while
// providing the data interpretation context and constraints required by the
// orchestrator.
// ---------------------------------------------------------------------------

function buildExercisePrompt(isLiving: boolean): string {
  const evolutionNote = isLiving
    ? '\n\nEvolução: compare com a análise anterior quando disponível, usando ↑↓= para indicar direção de mudança nos marcadores relevantes ao exercício.'
    : ''

  return `Analise os dados de saúde fornecidos sob a ótica da fisiologia do exercício e prescrição de atividade física.

Siga rigorosamente o formato e os critérios definidos no seu perfil de especialista (identificação de perfil fisiológico, avaliação de risco cardíaco, objetivos de treino, prescrição F.I.T.T., justificativa científica com citações da Base de Conhecimento).

Foque exclusivamente nos biomarcadores e dados com implicação direta para a prescrição de exercício físico. Ignore marcadores sem relevância para a fisiologia do exercício.${evolutionNote}

IMPORTANTE: O disclaimer médico é adicionado automaticamente pelo sistema — não o inclua na sua resposta.`
}

function buildNutritionPrompt(isLiving: boolean): string {
  const evolutionNote = isLiving
    ? '\n\nEvolução: compare com a análise anterior quando disponível, destacando mudanças em marcadores nutricionais (vitaminas, minerais, lipídios, glicemia).'
    : ''

  return `Analise os dados de saúde fornecidos sob a ótica da nutrição clínica funcional e bioquímica nutricional.

Siga o formato e os critérios definidos no seu perfil de especialista. Foque em:
- Status nutricional e deficiências identificadas nos biomarcadores
- Relação entre marcadores metabólicos (glicemia, insulina, lipídios) e padrão alimentar
- Recomendações nutricionais e de suplementação baseadas na Base de Conhecimento, com citações obrigatórias
- Estratégias alimentares específicas alinhadas ao objetivo de saúde declarado pelo paciente${evolutionNote}

IMPORTANTE: O disclaimer médico é adicionado automaticamente pelo sistema — não o inclua na sua resposta.`
}

function buildCardiologyPrompt(isLiving: boolean): string {
  const evolutionNote = isLiving
    ? '\n\nEvolução: compare com a análise anterior quando disponível, destacando tendências em marcadores cardiovasculares (lipídios, PCR-us, pressão arterial).'
    : ''

  return `Analise os dados de saúde fornecidos sob a ótica da cardiologia preventiva e saúde cardiovascular funcional.

Siga o formato e os critérios definidos no seu perfil de especialista. Foque em:
- Risco cardiovascular: perfil lipídico (LDL, HDL, triglicerídeos), marcadores inflamatórios (PCR-us), pressão arterial
- Estratificação de risco e implicações clínicas funcionais
- Recomendações preventivas baseadas na Base de Conhecimento, com citações obrigatórias
- Conexão entre marcadores cardiovasculares e outros eixos metabólicos${evolutionNote}

IMPORTANTE: O disclaimer médico é adicionado automaticamente pelo sistema — não o inclua na sua resposta.`
}

function buildEndocrinologyPrompt(isLiving: boolean): string {
  const evolutionNote = isLiving
    ? '\n\nEvolução: compare com a análise anterior quando disponível, destacando tendências em marcadores hormonais e metabólicos.'
    : ''

  return `Analise os dados de saúde fornecidos sob a ótica da endocrinologia funcional e saúde hormonal.

Siga o formato e os critérios definidos no seu perfil de especialista. Foque em:
- Eixo tireoidiano: TSH, T3, T4 livre — interpretação funcional vs. referências laboratoriais
- Eixo glicêmico/insulínico: glicemia, insulina, HOMA-IR, HbA1c
- Hormônios sexuais e adrenais quando disponíveis
- Recomendações baseadas na Base de Conhecimento, com citações obrigatórias${evolutionNote}

IMPORTANTE: O disclaimer médico é adicionado automaticamente pelo sistema — não o inclua na sua resposta.`
}

function buildNeurosciencePrompt(isLiving: boolean): string {
  const evolutionNote = isLiving
    ? '\n\nEvolução: compare com a análise anterior quando disponível, destacando mudanças com impacto em saúde neurológica, sono e comportamento.'
    : ''

  return `Analise os dados de saúde fornecidos sob a ótica da neurociência aplicada, otimização cognitiva e comportamento.

Siga o formato e os critérios definidos no seu perfil de especialista. Foque em:
- Biomarcadores com impacto em função cognitiva, humor e qualidade do sono (Vitamina D, hormônios, inflamação)
- Conexões entre dados laboratoriais e padrões de sono, estresse e desempenho mental
- Estratégias baseadas em neurociência fundamentadas na Base de Conhecimento, com citações obrigatórias
- Protocolos comportamentais e de estilo de vida alinhados ao objetivo declarado${evolutionNote}

IMPORTANTE: O disclaimer médico é adicionado automaticamente pelo sistema — não o inclua na sua resposta.`
}
