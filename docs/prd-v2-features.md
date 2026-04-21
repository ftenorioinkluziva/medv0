# SAMI V2 — Product Requirements Document
## New Features Batch

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-04-20 | 1.0 | Criação inicial — 4 épicos V2 | Morgan / SAMI Team |

---

## 1. Context

Este PRD especifica 4 épicos de evolução do SAMI a partir do estado atual (Cycle 6), com base em:

- Análise do schema existente (`medical_profiles`, `health_agents`, `documents`, `livingAnalyses`)
- Dados reais de bioimpedância InBody (PDF 16/04/2026)
- Decisões do usuário confirmadas em sessão de discovery

---

## 2. Épicos

### E10 — Document Categories (Organização de Uploads)
### E11 — Profile Enhancement (Aproveitamento de Bioimpedância)
### E12 — Dashboard Revamp (Dados que Importam)
### E13 — Product Generators (Novo Tipo de Agente)

---

## 3. E10 — Document Categories

### 3.1 Objetivo
Organizar uploads de documentos em categorias fixas para melhorar UX de upload e permitir filtragem contextual por categoria.

### 3.2 Categorias

| Categoria | Valor interno | Exemplos |
|-----------|--------------|----------|
| Bioimpedância | `bioimpedance` | InBody, Tanita, laudos de composição corporal |
| Exames de Sangue | `blood_test` | Hemograma, lipidograma, TSH, hormônios |
| Outros | `other` | Raios-X, densitometria, EEG, laudos diversos |

### 3.3 Requisitos Funcionais

**FR-E10-01:** Campo `category` adicionado à tabela `documents` (enum: `bioimpedance | blood_test | other`).

**FR-E10-02:** O classificador automático (`lib/documents/classifier.ts`) deve preencher `category` na criação do documento:
- `body_composition` classificação atual → `bioimpedance`
- `lab_test` classificação atual → `blood_test`
- Fallback → `other`

**FR-E10-03:** UI de upload deve exibir seletor de categoria com as 3 opções. O usuário pode sobrescrever a classificação automática.

**FR-E10-04:** Lista de documentos do usuário deve permitir filtro por categoria.

**FR-E10-05:** O campo `category` deve ser usado pelo pipeline de análise para contextualizar o tipo de documento (ex: bioimpedância passa pelo extrator de composição corporal automaticamente).

### 3.4 Requisitos Não Funcionais
- Migração: coluna `category` nullable inicialmente, backfill via classificador nos documentos existentes.
- Classificação automática deve ter acurácia ≥ 95% para InBody e hemogramas padrão.

### 3.5 Critérios de Aceite

```
Given: usuário faz upload de PDF InBody
When: processamento completa
Then: documento classificado como `bioimpedance` automaticamente

Given: usuário faz upload de hemograma
When: processamento completa
Then: documento classificado como `blood_test` automaticamente

Given: usuário acessa lista de documentos
When: seleciona filtro "Exames de Sangue"
Then: exibe apenas documentos com category = blood_test

Given: classificação automática resulta em `blood_test`
When: usuário altera manualmente para "Outros"
Then: categoria salva como `other`, sobrescreve automático
```

---

## 4. E11 — Profile Enhancement

### 4.1 Objetivo
Aproveitar os dados completos do InBody para enriquecer o perfil médico do usuário, organizando os campos em abas temáticas: **Dados Básicos** e **Dados Avançados**.

### 4.2 Gap Analysis — InBody vs Schema Atual

#### Campos já existentes (mapeados)
| Campo InBody | Coluna `medical_profiles` |
|---|---|
| Peso (kg) | `weight` |
| % Gordura Corporal | `bodyFatPercentage` |
| Massa Muscular Esquelética (kg) | `muscleMass` |
| Gordura Visceral (nível) | `visceralFatLevel` |
| Minerais / Massa Óssea (kg) | `boneMass` |
| Taxa Metabólica Basal (kcal) | `basalMetabolicRate` |

#### Campos novos a adicionar em `medical_profiles`
| Campo InBody | Nova coluna | Tipo |
|---|---|---|
| Água Corporal Total (L) | `bodyWaterLiters` | `numeric(5,2)` |
| Proteína (kg) | `proteinMass` | `numeric(5,2)` |
| Relação Cintura-Quadril | `waistHipRatio` | `numeric(4,3)` |
| Grau de Obesidade (%) | `obesityDegree` | `numeric(5,2)` |
| Pontuação InBody | `inbodyScore` | `integer` |
| Peso Ideal (kg) | `idealWeight` | `numeric(5,2)` |

#### Campos novos a adicionar em `bodyCompositionHistory`
| Campo InBody | Nova coluna | Tipo |
|---|---|---|
| Proteína (kg) | `proteinMass` | `numeric(5,2)` |
| Água Corporal Total (L) | `bodyWaterLiters` | `numeric(5,2)` |
| Relação Cintura-Quadril | `waistHipRatio` | `numeric(4,3)` |
| Grau de Obesidade (%) | `obesityDegree` | `numeric(5,2)` |
| Pontuação InBody | `inbodyScore` | `integer` |
| Peso Ideal (kg) | `idealWeight` | `numeric(5,2)` |
| Massa Magra — Braço Direito (kg) | `leanMassArmRight` | `numeric(4,2)` |
| Massa Magra — Braço Esquerdo (kg) | `leanMassArmLeft` | `numeric(4,2)` |
| Massa Magra — Tronco (kg) | `leanMassTrunk` | `numeric(5,2)` |
| Massa Magra — Perna Direita (kg) | `leanMassLegRight` | `numeric(4,2)` |
| Massa Magra — Perna Esquerda (kg) | `leanMassLegLeft` | `numeric(4,2)` |
| Gordura — Braço Direito (kg) | `fatMassArmRight` | `numeric(4,2)` |
| Gordura — Braço Esquerdo (kg) | `fatMassArmLeft` | `numeric(4,2)` |
| Gordura — Tronco (kg) | `fatMassTrunk` | `numeric(5,2)` |
| Gordura — Perna Direita (kg) | `fatMassLegRight` | `numeric(4,2)` |
| Gordura — Perna Esquerda (kg) | `fatMassLegLeft` | `numeric(4,2)` |

> **Nota:** Dados de impedância bruta não são armazenados — apenas métricas calculadas acima.

### 4.3 Estrutura de Abas do Perfil

#### Tab 1 — Dados Básicos
Campos obrigatórios + dados extraídos automaticamente de bioimpedância:

| Campo | Fonte |
|---|---|
| Idade | Manual |
| Sexo | Manual |
| Altura (cm) | Manual |
| Peso (kg) | Bioimpedância / Manual |
| % Gordura Corporal | Bioimpedância / Manual |
| Massa Muscular Esquelética (kg) | Bioimpedância |
| IMC (kg/m²) | Calculado (peso / altura²) |
| Objetivos de Saúde | Manual |
| Condições Médicas | Manual |
| Medicamentos | Manual |
| Pressão Sistólica / Diastólica | Manual |
| Frequência Cardíaca em Repouso | Manual |

#### Tab 2 — Dados Avançados — Composição Corporal
Dados detalhados de bioimpedância:

| Campo | Fonte |
|---|---|
| Gordura Visceral (nível) | Bioimpedância |
| Massa Óssea / Minerais (kg) | Bioimpedância |
| Taxa Metabólica Basal (kcal) | Bioimpedância |
| Proteína (kg) | Bioimpedância |
| Água Corporal Total (L) | Bioimpedância |
| Relação Cintura-Quadril | Bioimpedância |
| Grau de Obesidade (%) | Bioimpedância |
| Pontuação InBody | Bioimpedância |
| Peso Ideal (kg) | Bioimpedância |
| Massa Magra Segmentar (5 segmentos) | Bioimpedância |
| Gordura Segmentar (5 segmentos) | Bioimpedância |

#### Tab 3 — Dados Avançados — Estilo de Vida
Campos complementares existentes no schema:

| Campo |
|---|
| Qualidade do Sono (horas, qualidade 1-10, problemas) |
| Hidratação (litros/dia) |
| Nível de Estresse (1-10) |
| Tabagismo / Álcool |
| Suplementação |
| Dieta Atual |
| Atividade Física (tipo, frequência, duração, intensidade) |
| VO2 Max |
| Força (Handgrip, Sit-to-Stand) |
| Exposição à Luz Solar / Artificial |
| Histórico Familiar |

#### Tab 4 — Dados Avançados — Biomarcadores
- `latestBiomarkers` (jsonb) — exibição dinâmica de marcadores laboratoriais

### 4.4 Requisitos Funcionais

**FR-E11-01:** Adicionar colunas novas em `medical_profiles` conforme gap analysis acima.

**FR-E11-02:** Adicionar colunas novas em `bodyCompositionHistory` conforme gap analysis acima.

**FR-E11-03:** Extrator `lib/documents/body-composition.ts` deve extrair todos os campos novos do InBody.

**FR-E11-04:** UI do perfil deve ser reorganizada em 4 abas conforme estrutura acima.

**FR-E11-05:** Campos preenchidos via bioimpedância devem exibir indicador de origem (ícone) e data da última atualização.

**FR-E11-06:** Upload de bioimpedância deve atualizar automaticamente os campos correspondentes no perfil do usuário.

### 4.5 Critérios de Aceite

```
Given: usuário faz upload de PDF InBody
When: processamento completa
Then: campos water_liters, protein_mass, waist_hip_ratio, obesity_degree, inbody_score,
      ideal_weight, segmental lean/fat (10 campos) atualizados em medical_profiles
      E registro inserido em bodyCompositionHistory com os novos campos

Given: usuário acessa aba "Dados Básicos" do perfil
When: perfil carrega
Then: exibe campos básicos + campos de bioimpedância com indicador de fonte

Given: bioimpedância foi processada há 2 semanas
When: usuário acessa tab de composição corporal
Then: exibe data da última atualização InBody ao lado dos campos
```

---

## 5. E12 — Dashboard Revamp

### 5.1 Objetivo
Redesenhar o dashboard para exibir apenas informações de alto valor para o usuário, eliminando ruído e adicionando o resumo de saúde da última análise.

### 5.2 Estrutura do Novo Dashboard

#### Seção 1 — Perfil Básico
Card resumindo os principais dados do usuário:
- Nome, idade, sexo
- Peso atual + variação vs último registro
- % Gordura + variação
- IMC + classificação (Abaixo / Normal / Sobrepeso / Obesidade)
- Pontuação InBody (se disponível)
- CTA: "Atualizar Perfil"

#### Seção 2 — Últimos Documentos
Lista dos 5 documentos mais recentes:
- Nome do arquivo, categoria (badge), data do exame
- Status de processamento
- CTA: "Ver análise" → navega para a análise do documento

#### Seção 3 — Resumo do Estado de Saúde
Gerado a partir do campo `reportMarkdown` do `livingAnalyses` mais recente (versão atual):
- Exibe os primeiros parágrafos do `reportMarkdown` (campo de análise base/foundation)
- Limitado a ~300 palavras / truncado com "Ver análise completa →"
- Badge de data da última análise
- Se nenhuma análise disponível: CTA "Enviar primeiro documento"

### 5.3 Requisitos Funcionais

**FR-E12-01:** Dashboard busca `livingAnalyses` mais recente do usuário + `reportMarkdown` da versão atual.

**FR-E12-02:** Seção de perfil básico calcula IMC dinamicamente a partir de `weight` e `height`.

**FR-E12-03:** Lista de documentos exibe coluna `category` (E10) com badge visual por tipo.

**FR-E12-04:** Resumo de saúde trunca `reportMarkdown` em ~300 palavras preservando frases completas.

**FR-E12-05:** Dashboard deve carregar em ≤ 2s (3 queries paralelas: perfil, docs, análise).

### 5.4 Critérios de Aceite

```
Given: usuário tem perfil preenchido e ao menos 1 análise
When: acessa o dashboard
Then: vê card de perfil com peso/gordura/IMC, lista dos últimos 5 docs,
      e resumo de 300 palavras da última análise

Given: usuário não tem nenhuma análise
When: acessa o dashboard
Then: seção de resumo exibe CTA "Enviar primeiro documento"

Given: livingAnalysis tem reportMarkdown > 300 palavras
When: dashboard renderiza
Then: texto truncado com link "Ver análise completa →"
```

---

## 6. E13 — Product Generators

### 6.1 Objetivo
Introduzir um terceiro tipo de agente (`product_generator`) que gera "produtos de saúde" estruturados a partir das análises dos especialistas, com `output_schema` fixo em JSON, apresentados ao usuário em telas dedicadas.

### 6.2 Novo Valor para `analysisRole`

Adicionar `'product_generator'` ao enum `analysis_role` no banco.

### 6.3 Produtos Iniciais

| Produto | Tela | Output Schema |
|---------|------|---------------|
| `supplementation` | `/app/products/supplementation` | Ver abaixo |
| `meals` | `/app/products/meals` | Ver abaixo |
| `workout` | `/app/products/workout` | Ver abaixo |

### 6.4 Output Schemas

#### supplementation
```json
{
  "type": "object",
  "required": ["overview", "supplements"],
  "properties": {
    "overview": { "type": "string" },
    "supplements": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "dosage", "timing", "purpose"],
        "properties": {
          "name": { "type": "string" },
          "dosage": { "type": "string" },
          "timing": { "type": "string" },
          "purpose": { "type": "string" },
          "duration": { "type": "string" }
        }
      }
    },
    "hormonalSupport": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["hormone", "strategy", "monitoring"],
        "properties": {
          "hormone": { "type": "string" },
          "strategy": { "type": "string" },
          "monitoring": { "type": "string" }
        }
      }
    },
    "nextExamRecommendations": { "type": "array", "items": { "type": "string" } }
  }
}
```

#### meals
```json
{
  "type": "object",
  "required": ["overview", "weekly_plan", "daily_calories_avg"],
  "properties": {
    "overview": { "type": "string" },
    "daily_calories_avg": { "type": "string" },
    "weekly_plan": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["day", "meals"],
        "properties": {
          "day": { "type": "string" },
          "meals": {
            "type": "object",
            "required": ["breakfast", "morning_snack", "lunch", "afternoon_snack", "pre_workout", "post_workout", "dinner", "supper"],
            "additionalProperties": { "$ref": "#/definitions/meal" }
          }
        }
      }
    }
  },
  "definitions": {
    "meal": {
      "type": "object",
      "required": ["name", "ingredients", "instructions", "calories"],
      "properties": {
        "name": { "type": "string" },
        "calories": { "type": "string" },
        "ingredients": { "type": "array", "items": { "type": "string" } },
        "instructions": { "type": "string" },
        "macros": {
          "type": "object",
          "properties": {
            "protein": { "type": "string" },
            "carbs": { "type": "string" },
            "fats": { "type": "string" }
          }
        }
      }
    }
  }
}
```

#### workout
```json
{
  "type": "object",
  "required": ["overview", "workouts"],
  "properties": {
    "overview": { "type": "string" },
    "weeklyGoal": { "type": "string" },
    "restDays": { "type": "array", "items": { "type": "string" } },
    "progressionTips": { "type": "array", "items": { "type": "string" } },
    "workouts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["day", "type", "duration", "exercises"],
        "properties": {
          "day": { "type": "string" },
          "type": { "type": "string" },
          "duration": { "type": "string" },
          "intensity": { "type": "string" },
          "warmup": { "type": "string" },
          "cooldown": { "type": "string" },
          "exercises": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": { "type": "string" },
                "sets": { "type": "string" },
                "reps": { "type": "string" },
                "duration": { "type": "string" },
                "notes": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

### 6.5 Armazenamento dos Produtos

Nova tabela `generated_products`:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | — |
| `userId` | UUID FK → users | — |
| `livingAnalysisVersionId` | UUID FK → livingAnalysisVersions | Versão que gerou este produto |
| `agentId` | UUID FK → health_agents | Agente product_generator usado |
| `productType` | text | `supplementation | meals | workout` |
| `content` | jsonb | Output validado contra output_schema |
| `status` | text | `processing | completed | failed` |
| `errorMessage` | text | — |
| `tokensUsed` | integer | — |
| `durationMs` | integer | — |
| `createdAt` | timestamp | — |
| `updatedAt` | timestamp | — |

### 6.6 Pipeline de Execução

```
livingAnalysisVersion completa (foundation + specialized)
  │
  └─► Phase 3: Product Generators (paralelo)
        ├─ agent: supplementation_generator → generated_products
        ├─ agent: meals_generator → generated_products
        └─ agent: workout_generator → generated_products
```

**Trigger:** Após `specializedCompleted === total specialized agents` na versão de análise.

**Input dos Product Generators:**
- `foundationContext`: output dos agentes foundation
- `specializedContext`: output consolidado dos agentes especializados
- `medicalProfile`: dados do usuário
- `output_schema`: schema fixo do produto (do campo `outputSchema` em `health_agents`)

### 6.7 System Prompts dos Agentes

Cada product_generator recebe system prompt especializado:

**supplementation_generator:**
```
Você é um especialista em suplementação esportiva e terapêutica. Com base nas análises médicas e de composição corporal fornecidas, gere um plano de suplementação personalizado e seguro. Considere interações medicamentosas, deficiências identificadas nos exames e objetivos do paciente. SEMPRE inclua a ressalva: "Consulte seu médico antes de iniciar qualquer suplementação."

Responda EXCLUSIVAMENTE no formato JSON definido no output_schema. Não inclua texto fora do JSON.
```

**meals_generator:**
```
Você é um nutricionista especializado em periodização nutricional. Com base no perfil metabólico (TMB, composição corporal) e nos objetivos identificados nas análises, gere um plano alimentar semanal detalhado. Calcule macros e calorias respeitando as necessidades energéticas do paciente.

Responda EXCLUSIVAMENTE no formato JSON definido no output_schema. Não inclua texto fora do JSON.
```

**workout_generator:**
```
Você é um personal trainer especializado em periodização de treinos baseada em dados fisiológicos. Com base na composição corporal segmentar, capacidade cardiorrespiratória e objetivos identificados nas análises, gere um plano de treino semanal. Respeite limitações físicas descritas no perfil.

Responda EXCLUSIVAMENTE no formato JSON definido no output_schema. Não inclua texto fora do JSON.
```

### 6.8 Telas dos Produtos

Cada produto tem rota própria:
- `/app/products/supplementation` — lista suplementos em cards, seção de suporte hormonal, recomendações de exames
- `/app/products/meals` — plano semanal em tabs por dia, cards de refeição com ingredientes e modo de preparo
- `/app/products/workout` — treinos por dia em cards, exercícios com sets/reps, dias de descanso

Navegação: menu lateral inclui "Produtos" com sub-itens por tipo.

### 6.9 Requisitos Funcionais

**FR-E13-01:** Adicionar `product_generator` ao enum `analysisRole` no banco.

**FR-E13-02:** Criar tabela `generated_products` conforme especificação.

**FR-E13-03:** Orquestrador de análise (`complete-analysis.ts`) deve disparar product generators após fase de análise especializada concluída.

**FR-E13-04:** Validar output do agente contra `outputSchema` antes de salvar — salvar em `content` (jsonb).

**FR-E13-05:** Criar 3 agentes no seed: `supplementation_generator`, `meals_generator`, `workout_generator` com `analysisRole = 'product_generator'` e system prompts acima.

**FR-E13-06:** Criar rotas e páginas `/app/products/{type}` para exibição dos produtos.

**FR-E13-07:** Dashboard (E12) deve incluir link para últimos produtos gerados.

### 6.10 Critérios de Aceite

```
Given: análise completa termina (foundation + specialized)
When: todas as fases especializadas completam
Then: 3 product generators disparam em paralelo
      E registered em generated_products com status = processing

Given: product generator retorna JSON válido
When: validação contra output_schema passa
Then: content salvo em generated_products com status = completed

Given: produto do tipo supplementation está disponível
When: usuário acessa /app/products/supplementation
Then: vê overview + lista de suplementos com nome/dosagem/horário/propósito
      E seção de suporte hormonal (se preenchida)
      E recomendações de próximos exames

Given: usuário acessa /app/products/meals
When: produto meals disponível
Then: vê plano semanal em tabs por dia
      E cada refeição com ingredientes e modo de preparo

Given: product generator retorna JSON inválido
When: validação falha
Then: status = failed, errorMessage salvo, não exibe produto quebrado
```

---

## 7. Dependências entre Épicos

```
E10 (categorias) ──────────────────────────────► E11 (upload bioimpedância categorizado)
                                                   │
E11 (campos novos) ────────────────────────────► E12 (dashboard usa novos campos perfil)
                                                   │
E13 (product generators) ──────────────────────► E12 (dashboard linka produtos)
```

E13 pode ser desenvolvido independentemente de E10/E11.
E12 depende parcialmente de E10 (badges de categoria) e E11 (campos perfil).

---

## 8. Estimativas de Esforço

| Épico | Complexidade | Stories Estimadas |
|-------|-------------|------------------|
| E10 — Document Categories | Baixa | 2-3 |
| E11 — Profile Enhancement | Média | 4-5 |
| E12 — Dashboard Revamp | Média | 3-4 |
| E13 — Product Generators | Alta | 6-8 |

**Total estimado:** 15-20 stories. Sugestão: E10 + E11 no Cycle 7, E12 + E13 no Cycle 8.

---

## 9. Fora do Escopo (V2)

- Compartilhamento de produtos com médicos / exportação PDF
- Produto de tipo "cronograma de suplementação" com lembretes
- Edição manual dos produtos gerados pelo usuário
- Versionamento de produtos (manter apenas o mais recente por tipo)
- Módulo clínico para médicos

---

*SAMI PRD V2 — Morgan / AIOX — 2026-04-20*
