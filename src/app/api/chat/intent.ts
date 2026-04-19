export type ContextBlock =
  | 'profile_basic'
  | 'objectives_conditions'
  | 'biomarkers'
  | 'sleep_lifestyle'
  | 'exercise_chronobiology'
  | 'living_analysis'

const BLOCK_PATTERNS: Record<ContextBlock, RegExp> = {
  profile_basic: /.*/,

  objectives_conditions: /\b(objetivo|meta|condi[çc][ãa]o|diagn[oó]stico|doença|s[íi]ntoma|medicamento|rem[eé]dio|alergia|cirurgia|hist[oó]rico familiar|saúde|tratamento|patologia|melhora|pior[ao]u)\b/i,

  biomarkers: /\b(exame|laborat[oó]rio|sangue|colesterol|triglicer[íi]d|glicose|glicemia|hemoglobina|tsh|t3|t4|vitamina|ferritina|hemo|press[ãa]o|insulina|cortisol|biomarker|resultado|laudo|referência|valor)\b/i,

  sleep_lifestyle: /\b(sono|dormir|acordar|descanso|estresse|stress|ansiedade|[áa]lcool|fumo|cigarro|tabaco|hidrat|[áa]gua|suplemento|dieta|alimenta[çc][ãa]o|nutri[çc][ãa]o|comer|refei[çc][ãa]o|estilo de vida)\b/i,

  exercise_chronobiology: /\b(treino|exerc[íi]cio|academia|correr|nadar|pedalar|caminhada|atividade f[íi]sica|muscula[çc][ãa]o|hor[áa]rio|circadiano|sol|luz|jejum|[ú]ltima refei[çc][ãa]o|ritmo)\b/i,

  living_analysis: /\b(minha an[áa]lise|meu relat[oó]rio|resultado da an[áa]lise|o que (disseram|dizia|falou)|recomenda[çc][ãa]o|resumo|protocolo|plano semanal|an[áa]lise completa|[ú]ltima an[áa]lise)\b/i,
}

export function classifyIntent(message: string): Set<ContextBlock> {
  const blocks = new Set<ContextBlock>()

  blocks.add('profile_basic')

  for (const [block, pattern] of Object.entries(BLOCK_PATTERNS) as [ContextBlock, RegExp][]) {
    if (block === 'profile_basic') continue
    if (pattern.test(message)) {
      blocks.add(block)
    }
  }

  return blocks
}
