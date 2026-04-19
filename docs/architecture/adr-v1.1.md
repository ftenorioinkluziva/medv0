# ADR — SAMI v1.1 Architecture Decisions

| Date | Author | Status |
|------|--------|--------|
| 2026-04-07 | Aria (Architect) | Implemented (ADR-1, ADR-2, ADR-3, ADR-6) |
| 2026-04-18 | Orion (Orchestrator) | Updated — ADR-7 added (AI Gateway) |

---

## Scope

This ADR covers the 6 architectural changes required by PRD v1.1:

1. Multi-provider AI factory + model config
2. Knowledge base segmentation by agent
3. Output schema (structured output) bifurcation
4. Agent chat architecture
5. Document classification & bioimpedance routing
6. Orchestrator consolidation (tech debt)

Each section follows: **Context → Decision → Consequences → Implementation Notes**.

---

## ADR-1: Multi-Provider AI Factory

### Context

Today `analyzeWithAgent()` hardcodes `google()` from `@ai-sdk/google`. The `agent.model` field stores `google/gemini-2.5-flash` but only the slug after `/` is used. The synthesis step in both orchestrators also hardcodes `google('gemini-2.5-flash')`.

PRD v1.1 requires:
- Multiple AI providers (Google, OpenAI, Anthropic)
- Per-agent model configuration with advanced parameters (topP, topK, frequencyPenalty, presencePenalty, seed)

### Decision

**Create `lib/ai/providers/registry.ts`** with a `resolveModel(modelString)` function that:

```typescript
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import type { LanguageModelV1 } from 'ai'

const PROVIDERS: Record<string, (model: string) => LanguageModelV1> = {
  google: (model) => google(model),
  openai: (model) => openai(model),
  anthropic: (model) => anthropic(model),
}

export function resolveModel(modelString: string): LanguageModelV1 {
  const slashIndex = modelString.indexOf('/')
  if (slashIndex === -1) {
    return google(modelString) // backward compat: bare slug = google
  }
  const provider = modelString.slice(0, slashIndex)
  const model = modelString.slice(slashIndex + 1)
  const factory = PROVIDERS[provider]
  if (!factory) {
    throw new Error(`Unknown AI provider: ${provider}`)
  }
  return factory(model)
}
```

**Schema change on `health_agents`:**

```sql
ALTER TABLE health_agents ADD COLUMN model_config JSONB DEFAULT '{}';
```

The `modelConfig` JSONB stores provider-specific parameters. `analyzeWithAgent()` spreads these into the `generateText`/`generateObject` call:

```typescript
const modelConfig = agent.modelConfig as Record<string, unknown> ?? {}
const { text, usage } = await generateText({
  model: resolveModel(agent.model),
  system: agent.systemPrompt,
  prompt: fullPrompt,
  temperature: Number(agent.temperature),
  ...modelConfig, // topP, topK, frequencyPenalty, presencePenalty, seed
  abortSignal: signal,
})
```

**Synthesis also uses `resolveModel()`** — we introduce a `SYNTHESIS_MODEL` env var (default `google/gemini-2.5-flash`) that both orchestrators read, replacing the hardcoded `google('gemini-2.5-flash')`.

### Consequences

- **Positive:** Any provider supported by Vercel AI SDK can be added with one line in `PROVIDERS`.
- **Positive:** `modelConfig` is schemaless JSONB — supports any future parameter without migration.
- **Positive:** Backward compatible — existing agents with `google/gemini-2.5-flash` continue to work.
- **Negative:** New provider packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`) become dependencies. Install only when needed — tree-shaking removes unused providers.
- **Risk:** Invalid `modelConfig` keys silently passed to AI SDK. Mitigation: admin form validates known keys per provider.

### Implementation Notes

- **Files changed:** `src/lib/ai/core/resolve-model.ts` (new, replaces proposed `lib/ai/providers/registry.ts`), `src/lib/ai/agents/analyze.ts`, `src/lib/ai/orchestrator/living-analysis.ts`, `src/lib/ai/orchestrator/complete-analysis.ts`, `src/lib/db/schema/health-agents.ts`
- **Migration:** Add `model_config` column with default `'{}'::jsonb`
- **Admin form:** Replace text input for model with provider dropdown + model slug field. Add JSON editor for modelConfig with per-provider parameter presets.
- **Dependencies:** `@ai-sdk/openai`, `@ai-sdk/anthropic` (install as needed)

---

## ADR-7: Vercel AI Gateway + Configurable Models

### Context

After ADR-1 was implemented, all AI calls route through `resolveModel()` using provider-specific SDK packages (`@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`). Direct provider connections require separate API keys and lack centralized observability.

Additionally, the extraction model (`google('gemini-2.5-flash')`), synthesis model, and embedding model were hardcoded — requiring code changes to switch models.

### Decision

**Optional AI Gateway proxy** activated by `AI_GATEWAY_API_KEY` env var. When set, ALL model calls route through Vercel AI Gateway via `createOpenAI` with a custom `baseURL`:

```typescript
// src/lib/ai/core/ai-gateway.ts (shared module)
import { createOpenAI } from '@ai-sdk/openai'
export const aiGatewayProvider = process.env.AI_GATEWAY_API_KEY
  ? createOpenAI({ apiKey: process.env.AI_GATEWAY_API_KEY, baseURL: AI_GATEWAY_BASE_URL })
  : null
```

**Configurable models via env vars** (format: `"provider/model"`):

| Env Var | Default | Used By |
|---------|---------|---------|
| `DOCUMENT_EXTRACTION_MODEL` | `google/gemini-2.5-flash` | `src/lib/documents/extractor.ts` |
| `SYNTHESIS_MODEL` | `google/gemini-2.5-flash` | `src/lib/ai/orchestrator/pipeline.ts` |
| `GOOGLE_EMBEDDING_MODEL` | `gemini-embedding-001` | `src/lib/ai/rag/embedding-model.ts` |

Each has a `resolveXxxModel()` validator that warns and falls back on invalid format.

**Shared module pattern** — `src/lib/ai/core/ai-gateway.ts` exports `aiGatewayProvider` to avoid duplicating the gateway setup in `resolve-model.ts` and `embedding-model.ts`.

### Consequences

- **Positive:** Single `AI_GATEWAY_API_KEY` replaces multiple provider keys in production.
- **Positive:** Centralized observability, model fallbacks, and zero data retention via Vercel AI Gateway.
- **Positive:** Zero code changes required to switch providers/models — env vars only.
- **Positive:** Fully backward compatible — no gateway key = original per-provider routing.
- **Negative:** Gateway adds one network hop. Acceptable given Vercel infrastructure colocation.

### Implementation Notes

- **Files:** `src/lib/ai/core/ai-gateway.ts` (new), `src/lib/ai/core/resolve-model.ts`, `src/lib/ai/rag/embedding-model.ts`, `src/lib/documents/extractor.ts`, `src/lib/ai/orchestrator/pipeline.ts`
- **Status:** Implemented in v0.7.0 (PR #41)

---

## ADR-2: Knowledge Base Segmentation

### Context

Currently `searchKnowledge(query, topK)` searches across ALL articles in `knowledge_embeddings`. Every agent sees the entire knowledge base. A nutrition agent gets endocrinology chunks and vice-versa, diluting relevance.

PRD v1.1 requires each agent to have its own scoped knowledge base, with a global fallback.

### Decision

**New junction table `agent_knowledge`:**

```sql
CREATE TABLE agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES health_agents(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, article_id)
);
CREATE INDEX idx_agent_knowledge_agent ON agent_knowledge(agent_id);
CREATE INDEX idx_agent_knowledge_article ON agent_knowledge(article_id);
```

**New column on `knowledge_base`:**

```sql
ALTER TABLE knowledge_base ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT true;
```

**Modified `searchKnowledge()` signature:**

```typescript
export async function searchKnowledge(
  query: string,
  topK: number = 5,
  agentId?: string,
): Promise<KnowledgeChunk[]>
```

**Query strategy when `agentId` is provided:**

The vector search and BM25 search both add a WHERE clause:

```sql
WHERE ke.article_id IN (
  SELECT article_id FROM agent_knowledge WHERE agent_id = $agentId
)
OR kb.is_global = true
```

This means:
- Articles explicitly assigned to the agent are searched
- Articles marked `isGlobal = true` are always included (reference material, disclaimers, etc.)
- Unassigned, non-global articles are excluded

**When `agentId` is omitted:** Current behavior (search everything) — backward compatible.

**Migration strategy:**
- All existing articles get `is_global = true` (no behavior change)
- `agent_knowledge` table starts empty
- Admin gradually assigns articles to agents and flips `is_global` to `false` for specialized content

### Consequences

- **Positive:** Agent-scoped RAG increases relevance significantly.
- **Positive:** `isGlobal` provides graceful migration — everything works before any assignment.
- **Positive:** Same HNSW and GIN indexes used — no new index types needed.
- **Negative:** Additional JOIN in search queries. Mitigated by index on `agent_knowledge.agent_id`.
- **Negative:** Admin must manage agent-article associations. Mitigated by bulk assignment UI.

### Implementation Notes

- **Files changed:** `lib/db/schema/knowledge.ts` (add `isGlobal`), new `lib/db/schema/agent-knowledge.ts`, `lib/ai/rag/vector-search.ts` (filter logic), `lib/ai/agents/analyze.ts` (pass `agent.id` to `searchKnowledge`), `lib/ai/rag/uploader.ts` (accept optional `agentIds[]` on upload)
- **`analyzeWithAgent()` change:** Pass `agent.id` to `searchKnowledge()` so each agent gets scoped results.
- **Admin UI:** Edit agent page gets "Knowledge Base" section. Knowledge list page shows which agents use each article.

---

## ADR-3: Output Schema Bifurcation

### Context

Today all agents return Markdown text via `generateText()`. PRD v1.1 wants **some** agents (workout plan, nutrition, supplements) to return structured JSON via `generateText()` + `Output.object()` (AI SDK v6 pattern) with a JSON Schema defined per agent. This is optional — most agents continue returning text.

### Decision

**New columns on `health_agents`:**

```sql
ALTER TABLE health_agents ADD COLUMN output_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE health_agents ADD COLUMN output_schema JSONB;
-- output_type: 'text' (default) | 'structured'
-- output_schema: JSON Schema object, only used when output_type = 'structured'
```

**Bifurcation in `analyzeWithAgent()`:**

```typescript
export interface AgentAnalysisResult {
  content: string          // Markdown (text) or JSON string (structured)
  structuredOutput?: unknown // Parsed JSON object when structured
  outputType: 'text' | 'structured'
  ragContextUsed: boolean
  tokensUsed: number | null
  durationMs: number | null
  status: 'completed' | 'timeout' | 'error'
  errorMessage?: string
}
```

When `agent.outputType === 'structured'` and `agent.outputSchema` exists:

```typescript
import { generateText, Output } from 'ai'
import { jsonSchema } from 'ai'

const schema = jsonSchema(agent.outputSchema) // AI SDK v6 JSON Schema adapter
const { output, usage } = await generateText({
  model: resolveModel(agent.model),
  system: agent.systemPrompt,
  prompt: fullPrompt,
  output: Output.object({ schema }),
  temperature: Number(agent.temperature),
  ...modelConfig,
  abortSignal: signal,
})

return {
  content: JSON.stringify(output),
  structuredOutput: output,
  outputType: 'structured',
  ragContextUsed,
  tokensUsed: usage?.totalTokens ?? null,
  durationMs: Date.now() - startMs,
  status: 'completed',
}
```

When `agent.outputType === 'text'` (or no outputSchema): current `generateText()` path unchanged.

**Storage:** `analyses.content` stores JSON string for structured agents, Markdown for text agents. The `outputType` field on the analysis record indicates which.

**Synthesis exclusion:** Structured outputs are **excluded from the Markdown synthesis prompt** — they are standalone deliverables (workout plan, meal plan). They appear as separate sections in the UI, not merged into the report narrative.

### Consequences

- **Positive:** Zero impact on existing text agents — `outputType` defaults to `'text'`.
- **Positive:** JSON Schema stored as JSONB — admin can edit it without code deploys.
- **Positive:** `Output.object()` guarantees valid JSON matching the schema — no hallucination of structure.
- **Negative:** Admin needs a JSON Schema editor. Mitigated: provide presets for common schemas (workout, nutrition, supplements) and a raw JSON editor with validation.
- **Trade-off:** Structured agents run in the specialized phase but their output is not fed to synthesis. This is intentional — a workout plan doesn't belong in a medical narrative.

### Implementation Notes

- **Files changed:** `lib/db/schema/health-agents.ts`, `lib/ai/agents/analyze.ts`, orchestrators (filter structured outputs from synthesis input), `analyses.ts` schema (add `outputType` column)
- **New column on `analyses`:** `output_type TEXT NOT NULL DEFAULT 'text'`
- **UI rendering:** Detection logic in report page: if `analysis.outputType === 'structured'`, render with specialized component. Otherwise render Markdown.
- **Preset schemas:** Seed workout/nutrition/supplement JSON Schemas in the admin form as selectable presets.

---

## ADR-4: Agent Chat Architecture

### Context

PRD v1.1 introduces conversational chat with health agents. The chat must:
- Use exclusively the agent's scoped knowledge base (ADR-2)
- Include the user's latest analysis as context
- Stream responses in real-time
- Persist conversation history

### Decision

**New tables:**

```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_id UUID NOT NULL REFERENCES health_agents(id),
  living_analysis_id UUID REFERENCES living_analyses(id),
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
```

**API route: `POST /api/chat`**

Uses Vercel AI SDK's `streamText()`:

```typescript
import { streamText } from 'ai'

const ragContext = await searchKnowledge(lastUserMessage, 5, agent.id)
const analysisContext = latestAnalysis?.reportMarkdown ?? ''

const result = streamText({
  model: resolveModel(agent.model),
  system: buildChatSystemPrompt(agent, ragContext, analysisContext),
  messages: conversationHistory, // last 20 messages
  temperature: Number(agent.temperature),
  ...modelConfig,
  onFinish: async ({ text, usage }) => {
    await persistMessages(sessionId, userMessage, text, usage)
  },
})

return result.toUIMessageStreamResponse()
```

**Context building strategy:**

1. **System prompt:** Agent's `systemPrompt` + disclaimer
2. **RAG context:** `searchKnowledge()` scoped to agent (ADR-2), queried on the latest user message
3. **Analysis context:** User's latest `livingAnalyses.reportMarkdown` (truncated to last 4000 chars if needed)
4. **Conversation history:** Last 20 messages from the session

**Rate limiting:** 30 messages/hour/user enforced in the API route via a simple counter on `chat_messages` with `created_at > NOW() - INTERVAL '1 hour'`.

**Session management:**
- New session created when user picks an agent (or resumes latest session with that agent)
- Title auto-generated from first user message (first 50 chars)
- Sessions listed per-agent in the chat UI

### Consequences

- **Positive:** Full streaming support via AI SDK `streamText` — real-time UX.
- **Positive:** Agent-scoped RAG ensures the agent only answers from its knowledge domain.
- **Positive:** Analysis context gives the agent awareness of the user's health state.
- **Negative:** Chat history grows unbounded per user. Mitigation: paginate message fetches, consider archival policy later.
- **Risk:** Agent might hallucinate medical advice beyond educational scope. Mitigation: disclaimer in system prompt, disclaimer in UI, rate limit.

### Implementation Notes

- **Files:** New `lib/db/schema/chat.ts`, new `app/api/chat/route.ts`, new `app/app/chat/` pages
- **Dependencies:** None new — `streamText` is already available in the `ai` package.
- **Reuses:** `resolveModel()` from ADR-1, `searchKnowledge(query, topK, agentId)` from ADR-2.

---

## ADR-5: Document Classification & Bioimpedance Routing

### Context

Today the upload pipeline is linear:

```
Upload → extractMedicalDocument() → persistSnapshot() → triggerLivingAnalysis()
```

All documents trigger a full multi-agent analysis. But bioimpedance reports contain body composition data (% fat, muscle mass, visceral fat, BMR) that belongs in the Medical Profile, not in a lab analysis.

### Decision

**Add classification step after extraction:**

```
Upload → extractMedicalDocument() → classifyDocument() → route
  ├─ lab_test      → persistSnapshot() → triggerLivingAnalysis() (current)
  └─ body_composition → updateMedicalProfile() → persistBodyCompositionHistory()
```

**Classification logic (`lib/documents/classifier.ts`):**

```typescript
export type DocumentClass = 'lab_test' | 'body_composition'

export function classifyExtractedDocument(
  data: SanitizedMedicalDocument,
): DocumentClass {
  const bodyCompIndicators = [
    'gordura corporal', 'massa muscular', 'gordura visceral',
    'massa óssea', 'taxa metabólica', 'água corporal',
    'bioimpedância', 'body fat', 'muscle mass',
  ]

  const allParamNames = data.modules
    .flatMap(m => m.parameters.map(p => p.name.toLowerCase()))
  const allModuleNames = data.modules
    .map(m => m.moduleName.toLowerCase())
  const docType = data.documentType.toLowerCase()

  const searchText = [...allParamNames, ...allModuleNames, docType].join(' ')

  const matchCount = bodyCompIndicators.filter(ind =>
    searchText.includes(ind)
  ).length

  return matchCount >= 2 ? 'body_composition' : 'lab_test'
}
```

This is a heuristic classifier — deterministic, no LLM call needed. Two or more body composition indicators in parameter names or module names classify it as bioimpedance.

**New schema fields on `medical_profiles`:**

```sql
ALTER TABLE medical_profiles
  ADD COLUMN muscle_mass NUMERIC(5,2),
  ADD COLUMN visceral_fat_level NUMERIC(5,2),
  ADD COLUMN bone_mass NUMERIC(5,2),
  ADD COLUMN basal_metabolic_rate INTEGER,
  ADD COLUMN body_water_percentage NUMERIC(5,2);
```

**New table `body_composition_history`:**

```sql
CREATE TABLE body_composition_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  document_id UUID REFERENCES documents(id),
  weight NUMERIC(5,2),
  body_fat NUMERIC(5,2),
  muscle_mass NUMERIC(5,2),
  visceral_fat NUMERIC(5,2),
  bone_mass NUMERIC(5,2),
  bmr INTEGER,
  body_water NUMERIC(5,2),
  measured_at DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_body_comp_user ON body_composition_history(user_id, measured_at);
```

**Modified upload route:**

```typescript
const structuredData = await extractMedicalDocument(buffer, file.name, file.type)
const docClass = classifyExtractedDocument(structuredData)

if (docClass === 'body_composition') {
  const metrics = extractBodyCompositionMetrics(structuredData)
  await updateMedicalProfileWithBodyComp(session.user.id, metrics)
  await insertBodyCompositionHistory(session.user.id, documentId, metrics)
  // Document saved with processingStatus: 'profile_update'
  return NextResponse.json({
    success: true,
    documentId,
    profileUpdate: true,
    message: 'Dados de composição corporal atualizados no seu perfil.',
  })
}

// lab_test: current flow
```

### Consequences

- **Positive:** Bioimpedance data enriches the Medical Profile — agents see body composition in their context.
- **Positive:** No unnecessary analysis triggered for non-lab documents.
- **Positive:** Body composition history enables delta tracking (% fat ↓ 2.1% vs last measurement).
- **Positive:** Deterministic classifier — no LLM cost, instant classification.
- **Negative:** Heuristic classifier might misclassify edge cases. Mitigation: if uncertain (0-1 matches), default to `lab_test` (safer — triggers full analysis).
- **Trade-off:** Body composition documents are still saved in `documents` table for audit trail, but with `processingStatus: 'profile_update'` instead of `'completed'`.

### Implementation Notes

- **Files:** New `lib/documents/classifier.ts`, modified `app/api/documents/upload/route.ts`, new `lib/db/schema/body-composition.ts`, modified `lib/db/schema/medical-profiles.ts`
- **UI:** Upload response differentiates between "Análise iniciada" and "Perfil atualizado". Profile page shows body composition section with history.
- **Orchestrator impact:** `medicalProfileContext` in the orchestrators already reads from `medical_profiles` — new fields automatically included in analysis context.

---

## ADR-6: Orchestrator Consolidation

### Context

`complete-analysis.ts` (318 lines) and `living-analysis.ts` (391 lines) share ~250 lines of nearly identical logic:
- `readTimeoutMs()` helper
- Foundation sequential phase with per-agent timeout + AbortController
- Specialized parallel phase with `Promise.allSettled`
- Synthesis phase with `generateText` + fallback
- DB writes for individual analyses
- Error handling with status updates

The only differences:
- Living analysis passes `previousAnalysisContext` and `versionId`
- Complete analysis uses `completeAnalysisId`
- Different prompt texts (with/without evolution references)
- Different DB tables for the parent record

### Decision

**Extract shared pipeline to `lib/ai/orchestrator/pipeline.ts`:**

```typescript
export interface PipelineConfig {
  userId: string
  documentId: string
  snapshotContext: string
  medicalProfileContext: string
  previousAnalysisContext?: string
  analysisPrompt: string
  synthesisPrompt: string
  parentRecordRef: {
    field: 'completeAnalysisId' | 'livingAnalysisVersionId'
    value: string
  }
  timeouts: {
    hard: number
    foundation: number
    specialized: number
    synthesis: number
  }
}

export interface PipelineResult {
  reportMarkdown: string
  agentOutputs: AgentOutput[]
  foundationCompleted: number
  specializedCompleted: number
  totalDurationMs: number
}

export async function runAnalysisPipeline(
  config: PipelineConfig,
): Promise<PipelineResult>
```

Both `runLivingAnalysis()` and `runCompleteAnalysis()` become thin wrappers:
1. Read data from DB (snapshot, profile, previous version)
2. Set parent record to `processing`
3. Call `runAnalysisPipeline(config)`
4. Write result to their respective parent table
5. Handle errors by setting status to `failed`

**`AgentOutput` type moves to a shared `types.ts`** — eliminates the duplicate interface.

### Consequences

- **Positive:** ~250 lines of duplication eliminated.
- **Positive:** Bug fixes to the pipeline (e.g., synthesis error logging) apply to both paths.
- **Positive:** Future changes (e.g., structured output filtering from synthesis) only need one implementation.
- **Negative:** Additional abstraction layer. Mitigated: `PipelineConfig` is a simple data object, not a class hierarchy.

### Implementation Notes

- **Files:** `src/lib/ai/orchestrator/pipeline.ts` (implemented — `runFoundationPhase`, `runSpecializedPhase`, `runSynthesisPhase`, `buildMedicalProfileContext`). Simplified `living-analysis.ts` and `complete-analysis.ts`.
- **Status:** Implemented. `types.ts` was merged into `pipeline.ts` as inline exports.

---

## Cross-Cutting Concerns

### Dependency Graph

```
ADR-6 (Consolidation) ─── should be done FIRST
  │
ADR-1 (Multi-Provider) ─── standalone, but easier after consolidation
  │
ADR-2 (Knowledge Seg) ─── standalone schema change
  │
  ├── ADR-3 (Output Schema) ─── depends on ADR-1 for resolveModel
  │
  ├── ADR-4 (Chat) ─── depends on ADR-1 + ADR-2
  │
ADR-5 (Doc Classification) ─── standalone, no AI pipeline dependency
```

### Recommended Implementation Order

1. **ADR-6** — Consolidate orchestrators (reduces surface area for all subsequent changes)
2. **ADR-1** — Multi-provider factory (unlocks E9 stories)
3. **ADR-2** — Knowledge segmentation (unlocks E8 + E12)
4. **ADR-3** — Output schema bifurcation (builds on ADR-1)
5. **ADR-5** — Document classification (independent, can parallel with ADR-3/4)
6. **ADR-4** — Chat (builds on ADR-1 + ADR-2)

### DB Migration Plan

All schema changes can be additive (ADD COLUMN, CREATE TABLE) — no destructive migrations. Safe to apply incrementally per story:

| Migration | Story | Tables Affected |
|-----------|-------|----------------|
| Add `model_config` to `health_agents` | 9.2 | health_agents |
| Add `output_type`, `output_schema` to `health_agents` | 9.2 | health_agents |
| Add `output_type` to `analyses` | 9.2 | analyses |
| Add `is_global` to `knowledge_base` | 8.1 | knowledge_base |
| Create `agent_knowledge` | 8.1 | new table |
| Add body comp fields to `medical_profiles` | 11.2 | medical_profiles |
| Create `body_composition_history` | 11.2 | new table |
| Create `chat_sessions` + `chat_messages` | 12.1 | new tables |
| Add indexes (E7) | 7.1 | documents, analyses, living_analysis_versions, knowledge_base |

### Package Dependencies

| Package | Required By | Install When |
|---------|------------|--------------|
| `@ai-sdk/openai` | ADR-1 | E9 (only if admin configures OpenAI agents) |
| `@ai-sdk/anthropic` | ADR-1 | E9 (only if admin configures Anthropic agents) |

No other new packages required. `streamText`, `generateObject`, `jsonSchema` are all in the existing `ai` package.

---

## Delegation to @data-engineer

The following items require detailed schema design by @data-engineer (Dara):

1. **Exact DDL for all new tables and columns** with constraints, defaults, and indexes
2. **Migration ordering** — ensure FK references resolve correctly
3. **Query optimization** for the scoped `searchKnowledge()` — verify EXPLAIN plan with the agent_knowledge JOIN
4. **Index strategy** for `body_composition_history` and `chat_messages` at scale
5. **E7 indexes** — confirm the 5 missing indexes and generate migration

## Delegation to @ux-design-expert

The following require UX specification by @ux-design-expert (Uma):

1. **Chat UI** — mobile-first chat interface, agent selection, session management
2. **Structured output rendering** — workout/nutrition/supplement card components
3. **Body composition section** — profile page integration, evolution display
4. **Admin agent form** — model config editor, output schema editor, knowledge association UI
5. **Bottom navigation** — restructure mobile nav for new sections (Dashboard, Upload, Chat, Profile)

---

*Architecture decisions by Aria (AIOX Architect) — 2026-04-07*
*Based on: PRD v1.1, codebase analysis of 161 commits across 22 delivered stories*
