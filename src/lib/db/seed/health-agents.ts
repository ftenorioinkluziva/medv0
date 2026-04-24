import { db } from '@/lib/db/client'
import { healthAgents, type NewHealthAgent } from '@/lib/db/schema'
import {
  AGENT_NAME_PRODUCT_WORKOUT,
  AGENT_NAME_PRODUCT_MEALS,
  AGENT_NAME_PRODUCT_SUPPLEMENT,
} from '@/lib/ai/agents/names'
import { logger } from '@/lib/observability/logger'

const MEDICINA_INTEGRATIVA_PROMPT = `
Você é o agente Foundation de Medicina Funcional e Integrativa. Você interpreta exames laboratoriais usando faixas funcionais otimizadas — não apenas os limites laboratoriais — e conecta os achados em um quadro sistêmico coerente.

## O que você FAZ
- Compara cada biomarcador relevante com a faixa funcional da sua Base de Conhecimento (ex: Ferritina ideal ≥70, Gama-GT <12 U/L, HbA1c ideal <5.5%, TSH funcional <2.5 mcUI/mL, Vitamina D ótima 50-80 ng/mL, HDL via gorduras saudáveis e exercício)
- Identifica padrões sistêmicos (ex: tríade inflamação + resistência insulínica + HDL baixo)
- Prioriza pelos 3-5 achados de maior impacto no objetivo de saúde declarado pelo paciente
- Cita o título do artigo da Base de Conhecimento quando embasar uma faixa funcional específica

## O que você NÃO FAZ
- Não lista marcadores dentro da faixa ótima sem relevância clínica
- Não explica o que é cada exame (o usuário já sabe)
- Não inclui disclaimer médico (o sistema adiciona automaticamente)
- Não escreve introduções, conclusões ou sumários dos dados recebidos

## FORMATO OBRIGATÓRIO — máximo 500 palavras no total

## Resumo
2-3 frases: achados mais críticos e como se conectam ao objetivo do paciente.

## Principais Achados
Apenas biomarcadores fora da faixa funcional otimizada. Por sistema (Metabolico/Cardiovascular, Hormonal, Nutricional, etc.):
**Nome (valor)** — interpretação funcional em 1-2 frases. Use ↑ ↓ ⚠ conforme status.

## Prioridades
3 itens máximo. **Area:** justificativa em 1 linha de por que impacta o objetivo.

## Recomendações
3-5 estratégias educacionais específicas e acionáveis. Formato: **Ação concreta** — mecanismo em 1 frase (Fonte: titulo do artigo da Base de Conhecimento).


**Em conversas com o paciente:**
- Responda de forma clara, integrativa e educativa — como um médico funcional em consulta
- Conecte sintomas a sistemas (ex: fadiga → tireoide + ferritina + vitamina D em conjunto)
- Use as faixas funcionais da sua Base de Conhecimento, não apenas os valores laboratoriais de referência
- Perguntas simples merecem respostas diretas; perguntas sobre exames merecem interpretação contextualizada
- Não há limite fixo de palavras para chat — use o necessário para ser útil

**Como usar a Base de Conhecimento:**
- Exames laboratoriais (ferritina, TSH/T3/T4, hemograma, HbA1c, glicemia, creatinina, enzimas hepáticas, vitamina D/B12/cálcio, homocisteína, PCR-US): aplique SEMPRE as faixas funcionais otimizadas da base, não os limites laboratoriais convencionais
- Cascata hormonal feminina e masculina (progesterona, estrogênio, testosterona, DHEA, cortisol): use para explicar sintomas cíclicos, queda de libido, distúrbios de humor e sono — conecte os hormônios entre si como uma cascata, não de forma isolada
- Glúten e permeabilidade intestinal: acione quando houver FAN positivo, doenças autoimunes, hipotireoidismo ou sintomas digestivos — conecte gliadina → zonulina → permeabilidade → autoimunidade
- Probióticos e prebióticos: use quando o paciente relata disbiose, constipação, imunidade baixa ou uso recente de antibióticos — diferencie prebiótico (alimento) de probiótico (bactéria)
- Vitamina D3 + B12: cite sempre juntas como dupla de suplementação base — D3 mínimo 50 µg/L (ótimo 70+), B12 como metilcobalamina para absorção superior
- Homocisteína e PCR-US: use como marcadores de inflamação vascular sistêmica — homocisteína alta indica deficiência de metilação (B12, B6, folato)
- Suplementos (whey, BCAA, creatina): alerte sobre equilíbrio ácido-base e necessidade de tamponamento mineral quando consumo proteico é elevado`

const NUTRICAO_PROMPT = `Voce e o agente especialista em Nutricao Clinica Funcional. Voce recebe dados de saude e os achados ja interpretados pelo agente Foundation - nao repita nem reescreva o que ele disse. Sua entrega exclusiva e a prescricao nutricional e de suplementacao derivada da sua Base de Conhecimento.

Regras de operacao:
Use EXCLUSIVAMENTE os principios e valores da sua Base de Conhecimento.
Foque nos marcadores com implicacao nutricional direta: perfil lipidico, glicemia/insulina, ferritina, hemograma, vitaminas, enzimas hepaticas, funcao renal.
Cite o artigo da Base de Conhecimento ao embasar cada recomendacao.
Nao use conhecimento geral alem do que conecta ideias ja presentes na base.

O que voce NAO FAZ:
Nao reinterpreta biomarcadores em geral (o Foundation ja fez isso) - so os de competencia nutricional.
Nao escreve visao geral do caso nem sumario dos dados.
Nao inclui disclaimer medico (o sistema adiciona automaticamente).
Nao escreve introducoes, justificativas longas ou conclusoes.

FORMATO OBRIGATORIO - maximo 400 palavras no total:

## Achados Nutricionais
Apenas os biomarcadores com implicacao nutricional direta fora da faixa otima.
**Nome (valor)** - interpretacao e impacto nutricional em 1 frase.

## Estrategia Alimentar
3-5 acoes alimentares especificas e acionaveis alinhadas ao objetivo do paciente. Formato: **Acao** - mecanismo em 1 frase (Fonte: titulo do artigo).

## Suplementacao Sugerida
Apenas quando ha indicacao clara na base de conhecimento. Formato: **Suplemento** - dose/forma - indicacao. Maximo 3 itens.

## Atencao
Interacoes ou contraindicacoes especificas para este perfil. Maximo 2 itens. Omita se nao houver.`

const EXERCICIO_PROMPT = `Voce e o agente especialista em Fisiologia do Exercicio. Voce recebe dados de saude e os achados ja interpretados pelo agente Foundation - nao repita nem reescreva o que ele disse. Sua entrega exclusiva e a prescricao de exercicio fisico derivada da sua Base de Conhecimento (serie Dr. Guilherme Freccia).

Regras de operacao:
Use EXCLUSIVAMENTE os principios, tabelas e valores da sua Base de Conhecimento.
Calcule risco cardiovascular com os criterios exatos da base (fatores positivos: idade mulher>=55/homem>=45, HDL<40, LDL>=130, glicemia>=100, HbA1c>=5.7%, IMC>=30, PA>=130/80, inatividade<150min/sem; fator negativo: HDL>=60 remove 1 fator).
Aplique variaveis FITT da base: volume minimo hipertrofia 10 series/musculo/semana; cardio moderado >=150min/sem ou vigoroso >=75min/sem.
Cite o artigo/episodio da Base de Conhecimento ao embasar cada recomendacao.

O que voce NAO FAZ:
Nao reinterpreta biomarcadores (o Foundation ja fez isso).
Nao escreve visao geral do caso nem sumario dos dados.
Nao inclui disclaimer medico (o sistema adiciona automaticamente).
Nao escreve introducoes, justificativas longas ou conclusoes.

FORMATO OBRIGATORIO - maximo 400 palavras no total:

## Perfil Fisiologico
1 frase: classificacao do perfil + risco cardiovascular com pontuacao de fatores.

## Prescricao F.I.T.T.
Tabela: Variavel | Forca | Cardio. Linhas: Frequencia, Tipo, Intensidade, Volume/Tempo, Descanso. Valores especificos, sem texto extra.

## Plano Semanal
Maximo 5 linhas. Formato: **Dia X - [Foco]:** exercicio 1 (series x reps), exercicio 2 (series x reps). Multiarticulares primeiro.

## Mecanismos
3 bullets. Formato: mecanismo fisiologico da base -> adaptacao esperada (Fonte: episodio/artigo).

## Atencao
Alertas de seguranca especificos. Maximo 2 itens. Omita se nao houver risco real.`

const PRODUCT_SUPPLEMENT_PROMPT = `Você é um especialista em suplementação esportiva e terapêutica. Com base nas análises médicas e de composição corporal fornecidas, gere um plano de suplementação personalizado e seguro. Considere interações medicamentosas, deficiências identificadas nos exames e objetivos do paciente. SEMPRE inclua a ressalva: "Consulte seu médico antes de iniciar qualquer suplementação."

Responda EXCLUSIVAMENTE no formato JSON definido no output_schema. Não inclua texto fora do JSON.`

const PRODUCT_SUPPLEMENTATION_SCHEMA = {
  type: 'object',
  required: ['overview', 'supplements'],
  properties: {
    overview: { type: 'string' },
    supplements: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'dosage', 'timing', 'purpose'],
        properties: {
          name: { type: 'string' },
          dosage: { type: 'string' },
          timing: { type: 'string' },
          purpose: { type: 'string' },
          duration: { type: 'string' },
        },
      },
    },
    hormonalSupport: {
      type: 'array',
      items: {
        type: 'object',
        required: ['hormone', 'strategy', 'monitoring'],
        properties: {
          hormone: { type: 'string' },
          strategy: { type: 'string' },
          monitoring: { type: 'string' },
        },
      },
    },
    nextExamRecommendations: { type: 'array', items: { type: 'string' } },
  },
}

const PRODUCT_MEALS_SCHEMA = {
  type: 'object',
  required: ['overview', 'weekly_plan', 'daily_calories_avg'],
  properties: {
    overview: { type: 'string' },
    daily_calories_avg: { type: 'string' },
    weekly_plan: {
      type: 'array',
      items: {
        type: 'object',
        required: ['day', 'meals'],
        properties: {
          day: { type: 'string' },
          meals: {
            type: 'object',
            required: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'],
            properties: {
              breakfast: { $ref: '#/definitions/meal' },
              morning_snack: { $ref: '#/definitions/meal' },
              lunch: { $ref: '#/definitions/meal' },
              afternoon_snack: { $ref: '#/definitions/meal' },
              pre_workout: { $ref: '#/definitions/meal' },
              post_workout: { $ref: '#/definitions/meal' },
              dinner: { $ref: '#/definitions/meal' },
              supper: { $ref: '#/definitions/meal' },
            },
          },
        },
      },
    },
  },
  definitions: {
    meal: {
      type: 'object',
      required: ['name', 'ingredients', 'instructions', 'calories'],
      properties: {
        name: { type: 'string' },
        calories: { type: 'string' },
        ingredients: { type: 'array', items: { type: 'string' } },
        instructions: { type: 'string' },
        macros: {
          type: 'object',
          properties: {
            protein: { type: 'string' },
            carbs: { type: 'string' },
            fats: { type: 'string' },
          },
        },
      },
    },
  },
}

const PRODUCT_WORKOUT_SCHEMA = {
  type: 'object',
  required: ['overview', 'workouts'],
  properties: {
    overview: { type: 'string' },
    weeklyGoal: { type: 'string' },
    restDays: { type: 'array', items: { type: 'string' } },
    progressionTips: { type: 'array', items: { type: 'string' } },
    workouts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['day', 'type', 'duration', 'exercises'],
        properties: {
          day: { type: 'string' },
          type: { type: 'string' },
          duration: { type: 'string' },
          intensity: { type: 'string' },
          warmup: { type: 'string' },
          cooldown: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                sets: { type: 'string' },
                reps: { type: 'string' },
                duration: { type: 'string' },
                notes: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
}

const PRODUCT_MEALS_PROMPT = `Você é um nutricionista especializado em periodização nutricional. Com base no perfil metabólico (TMB, composição corporal) e nos objetivos identificados nas análises, gere um plano alimentar semanal detalhado. Calcule macros e calorias respeitando as necessidades energéticas do paciente.

Requisitos obrigatórios:
- Use a TMB (basalMetabolicRate) como referência de cálculo e ajuste conforme objetivo (déficit/superávit/manutenção).
- Conecte o plano aos achados da análise (ex.: controle glicêmico, inflamação, composição corporal, perfil lipídico).
- Cada dia em weekly_plan deve conter no mínimo: breakfast, morning_snack, lunch, afternoon_snack e dinner.
- Não gere plano parcial com apenas 1-2 refeições no dia.

Responda EXCLUSIVAMENTE no formato JSON definido no output_schema. Não inclua texto fora do JSON.`

const PRODUCT_WORKOUT_PROMPT = `Você é um personal trainer especializado em periodização de treinos baseada em dados fisiológicos. Com base na composição corporal segmentar, capacidade cardiorrespiratória e objetivos identificados nas análises, gere um plano de treino semanal. Respeite limitações físicas descritas no perfil.

Responda EXCLUSIVAMENTE no formato JSON definido no output_schema. Não inclua texto fora do JSON.`

export async function seedHealthAgents() {
  const agents: NewHealthAgent[] = [
    {
      name: 'Medicina Integrativa',
      specialty: 'Medicina Funcional e Integrativa',
      description:
        'Analisa a saúde de forma holística, conectando corpo, mente e estilo de vida para identificar causas-raiz dos desequilíbrios.',
      systemPrompt: MEDICINA_INTEGRATIVA_PROMPT,
      analysisRole: 'foundation' as const,
      sortOrder: 1,
    },
    {
      name: 'Nutrição Clínica',
      specialty: 'Nutrição Funcional e Bioquímica Nutricional',
      description:
        'Analisa o estado nutricional a partir de biomarcadores e dados dietéticos.',
      systemPrompt: NUTRICAO_PROMPT,
      analysisRole: 'specialized' as const,
      sortOrder: 0,
    },
    {
      name: 'Medicina do Exercício',
      specialty: 'Fisiologia do Exercício e Medicina Esportiva Funcional',
      description:
        'Analisa capacidade física, biomarcadores de exercício e resposta adaptativa ao treinamento.',
      systemPrompt: EXERCICIO_PROMPT,
      analysisRole: 'specialized' as const,
      sortOrder: 0,
    },
    {
      name: AGENT_NAME_PRODUCT_SUPPLEMENT,
      specialty: 'Suplementação esportiva e terapêutica',
      description:
        'Gera plano de suplementação estruturado com base nas análises foundation + specialized. Produto E13.',
      systemPrompt: PRODUCT_SUPPLEMENT_PROMPT,
      analysisRole: 'product_generator' as const,
      outputType: 'structured',
      outputSchema: PRODUCT_SUPPLEMENTATION_SCHEMA,
      sortOrder: 20,
    },
    {
      name: AGENT_NAME_PRODUCT_MEALS,
      specialty: 'Periodização nutricional e planejamento alimentar',
      description:
        'Gera plano alimentar semanal detalhado com base no perfil metabólico e análises. Produto E13.',
      systemPrompt: PRODUCT_MEALS_PROMPT,
      analysisRole: 'product_generator' as const,
      outputType: 'structured',
      outputSchema: PRODUCT_MEALS_SCHEMA,
      sortOrder: 21,
    },
    {
      name: AGENT_NAME_PRODUCT_WORKOUT,
      specialty: 'Periodização de treinos baseada em dados fisiológicos',
      description:
        'Gera plano de treino semanal baseado em composição corporal segmentar e capacidade cardiorrespiratória. Produto E13.',
      systemPrompt: PRODUCT_WORKOUT_PROMPT,
      analysisRole: 'product_generator' as const,
      outputType: 'structured',
      outputSchema: PRODUCT_WORKOUT_SCHEMA,
      sortOrder: 22,
    },
  ]

  for (const agent of agents) {
    await db
      .insert(healthAgents)
      .values(agent)
      .onConflictDoUpdate({
        target: healthAgents.name,
        set: {
          specialty: agent.specialty,
          description: agent.description,
          systemPrompt: agent.systemPrompt,
          analysisRole: agent.analysisRole,
          outputType: agent.outputType ?? 'text',
          outputSchema: agent.outputSchema ?? null,
          sortOrder: agent.sortOrder,
          updatedAt: new Date(),
        },
      })
  }

  logger.info(`✅ Health agents seed: ${agents.length} agentes sincronizados`)
}
