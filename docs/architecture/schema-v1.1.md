# Schema Design — SAMI v1.1

| Date | Author | Status | Depends On |
|------|--------|--------|------------|
| 2026-04-08 | Dara (Data Engineer) | Proposed | ADR v1.1 (Aria) |

---

## Current Schema Inventory

| Table | PK | FKs | Indexes | Notes |
|-------|-----|-----|---------|-------|
| `users` | uuid `id` | — | unique(`email`) | `roleEnum: patient, admin` |
| `password_reset_tokens` | uuid `id` | `user_id → users` | unique(`token`) | cascade delete |
| `medical_profiles` | uuid `id` | `user_id → users` | unique(`user_id`) | cascade delete |
| `documents` | uuid `id` | `user_id → users` | **none on userId** | missing index |
| `snapshots` | uuid `id` | `document_id → documents`, `user_id → users` | unique(`document_id`), idx(`user_id, created_at`) | |
| `health_agents` | uuid `id` | — | unique(`name`) | `analysisRoleEnum` |
| `knowledge_base` | uuid `id` | — | **none** | needs `source` index |
| `knowledge_embeddings` | uuid `id` | `article_id → knowledge_base` | HNSW(`embedding`), GIN(`content_tsv`) | cascade delete |
| `living_analyses` | uuid `id` | `user_id → users` | unique(`user_id`) | |
| `living_analysis_versions` | uuid `id` | `living_analysis_id → living_analyses`, `trigger_document_id → documents` | **none on living_analysis_id** | missing index |
| `complete_analyses` | uuid `id` | `user_id → users`, `document_id → documents` | unique(`document_id`) | deprecated |
| `analyses` | uuid `id` | `user_id → users`, `document_id → documents`, `complete_analysis_id → complete_analyses`, `living_analysis_version_id → living_analysis_versions`, `agent_id → health_agents` | **none on userId, livingAnalysisVersionId** | missing indexes |

---

## Migration Plan — 7 Migrations in Dependency Order

All migrations are **additive** (ADD COLUMN, CREATE TABLE, CREATE INDEX) — no destructive DDL. Safe for zero-downtime deployment.

Migrations are designed to be implemented as **Drizzle schema changes** (modify `.ts` files → `pnpm db:generate` → `pnpm db:migrate`). The SQL below documents the expected output for review and EXPLAIN plan verification.

---

### Migration 1: E7 — Missing Indexes (Story 7.1)

**Priority:** P0 — Must ship before any other v1.1 work.

**Rationale:** Every user-scoped query on `documents`, `analyses`, and `living_analysis_versions` does a sequential scan. At 100+ users with 10+ documents each, these become a bottleneck.

**Drizzle schema changes:**

```typescript
// documents.ts — add index on userId
export const documents = pgTable('documents', {
  // ... existing columns
}, (table) => [
  index('idx_documents_user_id').on(table.userId),
])

// analyses.ts — add indexes on userId and livingAnalysisVersionId
export const analyses = pgTable('analyses', {
  // ... existing columns
}, (table) => [
  index('idx_analyses_user_id').on(table.userId),
  index('idx_analyses_living_version_id').on(table.livingAnalysisVersionId),
])

// analyses.ts — add index on livingAnalysisVersions.livingAnalysisId
export const livingAnalysisVersions = pgTable('living_analysis_versions', {
  // ... existing columns
}, (table) => [
  index('idx_lav_living_analysis_id').on(table.livingAnalysisId),
])

// knowledge.ts — add index on knowledgeBase.source
export const knowledgeBase = pgTable('knowledge_base', {
  // ... existing columns
}, (table) => [
  index('idx_knowledge_base_source').on(table.source),
])
```

**Expected SQL:**

```sql
-- Migration 0011: E7 indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_documents_user_id"
  ON "documents" ("user_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_analyses_user_id"
  ON "analyses" ("user_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_analyses_living_version_id"
  ON "analyses" ("living_analysis_version_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_lav_living_analysis_id"
  ON "living_analysis_versions" ("living_analysis_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_knowledge_base_source"
  ON "knowledge_base" ("source");
```

**EXPLAIN verification targets:**
- `SELECT * FROM documents WHERE user_id = $1` → Index Scan on `idx_documents_user_id`
- `SELECT * FROM analyses WHERE user_id = $1` → Index Scan on `idx_analyses_user_id`
- `SELECT * FROM living_analysis_versions WHERE living_analysis_id = $1 ORDER BY version DESC LIMIT 1` → Index Scan on `idx_lav_living_analysis_id`

**Note:** Drizzle Kit does not generate `CONCURRENTLY`. For production, consider running these manually with `CONCURRENTLY` to avoid table locks. For Neon Postgres (serverless), standard `CREATE INDEX` is typically fine as table sizes are small in MVP.

---

### Migration 2: E7 — analyses.outputType Column (Story 7.4 prep for E9)

**Rationale:** Adding `output_type` to `analyses` early (in E7) avoids a schema dependency when E9 stories modify `analyzeWithAgent()`.

**Drizzle schema change:**

```typescript
// analyses.ts
export const analyses = pgTable('analyses', {
  // ... existing columns
  outputType: text('output_type').notNull().default('text'),
  // ...
})
```

**Expected SQL:**

```sql
ALTER TABLE "analyses"
  ADD COLUMN "output_type" TEXT NOT NULL DEFAULT 'text';
```

---

### Migration 3: E8 — Knowledge Segmentation (Story 8.1)

**Rationale:** `agent_knowledge` junction table + `isGlobal` flag on `knowledge_base`. This is the foundation for scoped RAG queries.

**New file: `src/lib/db/schema/agent-knowledge.ts`**

```typescript
import { pgTable, uuid, timestamp, unique, index } from 'drizzle-orm/pg-core'
import { healthAgents } from './health-agents'
import { knowledgeBase } from './knowledge'

export const agentKnowledge = pgTable(
  'agent_knowledge',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => healthAgents.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('agent_knowledge_agent_article_unique').on(table.agentId, table.articleId),
    index('idx_agent_knowledge_agent_id').on(table.agentId),
    index('idx_agent_knowledge_article_id').on(table.articleId),
  ],
)

export type AgentKnowledge = typeof agentKnowledge.$inferSelect
export type NewAgentKnowledge = typeof agentKnowledge.$inferInsert
```

**Modification: `src/lib/db/schema/knowledge.ts`**

```typescript
// Add to knowledgeBase table definition:
isGlobal: boolean('is_global').notNull().default(true),
```

**Update: `src/lib/db/schema/index.ts`**

```typescript
export * from './agent-knowledge'
```

**Expected SQL:**

```sql
-- knowledge_base: add is_global with backward-compatible default
ALTER TABLE "knowledge_base"
  ADD COLUMN "is_global" BOOLEAN NOT NULL DEFAULT true;

-- agent_knowledge: junction table
CREATE TABLE "agent_knowledge" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "health_agents"("id") ON DELETE CASCADE,
  "article_id" UUID NOT NULL REFERENCES "knowledge_base"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "agent_knowledge_agent_article_unique" UNIQUE("agent_id", "article_id")
);

CREATE INDEX "idx_agent_knowledge_agent_id" ON "agent_knowledge" ("agent_id");
CREATE INDEX "idx_agent_knowledge_article_id" ON "agent_knowledge" ("article_id");
```

**Migration safety:** All existing articles get `is_global = true` by default — no behavior change. `agent_knowledge` starts empty. Backward compatible.

**Query pattern for scoped search:**

```sql
-- When agentId is provided, filter embeddings by agent scope OR global articles
SELECT ke.*, kb.title, kb.source, kb.author, kb.category, kb.is_verified
FROM knowledge_embeddings ke
INNER JOIN knowledge_base kb ON ke.article_id = kb.id
WHERE (
  ke.article_id IN (
    SELECT article_id FROM agent_knowledge WHERE agent_id = $agentId
  )
  OR kb.is_global = true
)
ORDER BY 1 - (ke.embedding <=> $queryEmbedding) DESC
LIMIT $candidateLimit;
```

**EXPLAIN verification:**
- The subquery `SELECT article_id FROM agent_knowledge WHERE agent_id = $agentId` uses `idx_agent_knowledge_agent_id` → Index Scan.
- The `kb.is_global` filter uses a sequential check on the small result set (post-JOIN), acceptable given the LIMIT.
- For large knowledge bases (10K+ articles), consider a partial index: `CREATE INDEX idx_kb_global ON knowledge_base(id) WHERE is_global = true;`

---

### Migration 4: E9 — Agent Model Config & Output Schema (Story 9.2)

**Rationale:** `modelConfig` JSONB for advanced parameters, `outputType` and `outputSchema` for structured generation.

**Modification: `src/lib/db/schema/health-agents.ts`**

```typescript
export const healthAgents = pgTable('health_agents', {
  // ... existing columns (id, name, specialty, description, systemPrompt, analysisRole, model, temperature, maxTokens, isActive, sortOrder, createdAt, updatedAt)
  modelConfig: jsonb('model_config').$type<Record<string, unknown>>().notNull().default({}),
  outputType: text('output_type').notNull().default('text'),
  outputSchema: jsonb('output_schema').$type<Record<string, unknown>>(),
})
```

**Expected SQL:**

```sql
ALTER TABLE "health_agents"
  ADD COLUMN "model_config" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "health_agents"
  ADD COLUMN "output_type" TEXT NOT NULL DEFAULT 'text';

ALTER TABLE "health_agents"
  ADD COLUMN "output_schema" JSONB;
```

**Column semantics:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `model_config` | JSONB | `{}` | `{ topP, topK, frequencyPenalty, presencePenalty, seed }` — spread into AI SDK call |
| `output_type` | TEXT | `'text'` | `'text'` → `generateText`, `'structured'` → `Output.object()` |
| `output_schema` | JSONB | `null` | JSON Schema for structured output. Only used when `output_type = 'structured'` |

**Validation constraints (application-level, not DB):**
- When `output_type = 'structured'`, `output_schema` must be a valid JSON Schema object
- When `output_type = 'text'`, `output_schema` is ignored (can be null)
- `model_config` keys validated per provider in the admin form

---

### Migration 5: E11 — Body Composition (Story 11.2)

**Rationale:** New fields on `medical_profiles` for bioimpedance data + new `body_composition_history` table for temporal evolution.

**Modification: `src/lib/db/schema/medical-profiles.ts`**

```typescript
// Add after existing biomarker fields:
muscleMass: numeric('muscle_mass', { precision: 5, scale: 2 }),
visceralFatLevel: numeric('visceral_fat_level', { precision: 5, scale: 2 }),
boneMass: numeric('bone_mass', { precision: 5, scale: 2 }),
basalMetabolicRate: integer('basal_metabolic_rate'),
bodyWaterPercentage: numeric('body_water_percentage', { precision: 5, scale: 2 }),
```

**New file: `src/lib/db/schema/body-composition.ts`**

```typescript
import { pgTable, uuid, numeric, integer, date, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { documents } from './documents'

export const bodyCompositionHistory = pgTable(
  'body_composition_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    documentId: uuid('document_id')
      .references(() => documents.id),
    weight: numeric('weight', { precision: 5, scale: 2 }),
    bodyFat: numeric('body_fat', { precision: 5, scale: 2 }),
    muscleMass: numeric('muscle_mass', { precision: 5, scale: 2 }),
    visceralFat: numeric('visceral_fat', { precision: 5, scale: 2 }),
    boneMass: numeric('bone_mass', { precision: 5, scale: 2 }),
    bmr: integer('bmr'),
    bodyWater: numeric('body_water', { precision: 5, scale: 2 }),
    measuredAt: date('measured_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_body_comp_user_measured').on(table.userId, table.measuredAt),
  ],
)

export type BodyCompositionHistory = typeof bodyCompositionHistory.$inferSelect
export type NewBodyCompositionHistory = typeof bodyCompositionHistory.$inferInsert
```

**Update: `src/lib/db/schema/index.ts`**

```typescript
export * from './body-composition'
```

**Expected SQL:**

```sql
-- medical_profiles: new body composition fields
ALTER TABLE "medical_profiles"
  ADD COLUMN "muscle_mass" NUMERIC(5,2),
  ADD COLUMN "visceral_fat_level" NUMERIC(5,2),
  ADD COLUMN "bone_mass" NUMERIC(5,2),
  ADD COLUMN "basal_metabolic_rate" INTEGER,
  ADD COLUMN "body_water_percentage" NUMERIC(5,2);

-- body_composition_history: temporal evolution table
CREATE TABLE "body_composition_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "document_id" UUID REFERENCES "documents"("id"),
  "weight" NUMERIC(5,2),
  "body_fat" NUMERIC(5,2),
  "muscle_mass" NUMERIC(5,2),
  "visceral_fat" NUMERIC(5,2),
  "bone_mass" NUMERIC(5,2),
  "bmr" INTEGER,
  "body_water" NUMERIC(5,2),
  "measured_at" DATE NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_body_comp_user_measured"
  ON "body_composition_history" ("user_id", "measured_at");
```

**Design decisions:**
- `document_id` is **nullable** — allows manual entry of body comp data (not from upload)
- `measured_at` is **DATE** (not TIMESTAMP) — bioimpedance reports have date precision, not time
- Compound index `(user_id, measured_at)` supports the primary query: "get all measurements for user ordered by date"
- All numeric fields are nullable — a given bioimpedance report may not contain all fields
- No cascade delete on `user_id` — history preserved if user soft-deleted (isActive=false). Revisit if hard delete is needed.

---

### Migration 6: E12 — Chat Schema (Story 12.1)

**New file: `src/lib/db/schema/chat.ts`**

```typescript
import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { healthAgents } from './health-agents'
import { livingAnalyses } from './analyses'

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => healthAgents.id),
    livingAnalysisId: uuid('living_analysis_id')
      .references(() => livingAnalyses.id),
    title: text('title').notNull().default('Nova conversa'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_chat_sessions_user_id').on(table.userId),
    index('idx_chat_sessions_user_agent').on(table.userId, table.agentId),
  ],
)

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'user' | 'assistant'
    content: text('content').notNull(),
    tokensUsed: integer('tokens_used'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_chat_messages_session_id').on(table.sessionId),
    index('idx_chat_messages_session_created').on(table.sessionId, table.createdAt),
  ],
)

export type ChatSession = typeof chatSessions.$inferSelect
export type NewChatSession = typeof chatSessions.$inferInsert
export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
```

**Update: `src/lib/db/schema/index.ts`**

```typescript
export * from './chat'
```

**Expected SQL:**

```sql
CREATE TABLE "chat_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "agent_id" UUID NOT NULL REFERENCES "health_agents"("id"),
  "living_analysis_id" UUID REFERENCES "living_analyses"("id"),
  "title" TEXT NOT NULL DEFAULT 'Nova conversa',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_chat_sessions_user_id" ON "chat_sessions" ("user_id");
CREATE INDEX "idx_chat_sessions_user_agent" ON "chat_sessions" ("user_id", "agent_id");

CREATE TABLE "chat_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL REFERENCES "chat_sessions"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tokens_used" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_chat_messages_session_id" ON "chat_messages" ("session_id");
CREATE INDEX "idx_chat_messages_session_created" ON "chat_messages" ("session_id", "created_at");
```

**Design decisions:**
- `livingAnalysisId` is **nullable** — user can chat before having any analysis
- Compound index `(user_id, agent_id)` on sessions supports "find latest session with agent X for user Y"
- Compound index `(session_id, created_at)` on messages supports "get last 20 messages in session" efficiently
- `CASCADE DELETE` on messages when session is deleted — no orphan messages
- No cascade delete on sessions when user is deleted — sessions preserved for audit. Revisit with GDPR/LGPD data deletion requirements.
- `role` is TEXT not ENUM — avoids migration for future roles (e.g., 'system', 'tool')

**Rate limiting query (application-level):**

```sql
-- Count messages from user in last hour (for 30/hour limit)
SELECT COUNT(*) FROM chat_messages cm
INNER JOIN chat_sessions cs ON cm.session_id = cs.id
WHERE cs.user_id = $userId
  AND cm.role = 'user'
  AND cm.created_at > NOW() - INTERVAL '1 hour';
```

This query benefits from `idx_chat_messages_session_created` and `idx_chat_sessions_user_id`. For high-volume usage, consider a dedicated `user_chat_rate` counter table with upsert — but at current scale (30 msg/hr/user) the JOIN is sufficient.

---

### Migration 7: E7 — Remove `doctor` Role from Proxy (Non-DB)

This is a code-only change (no SQL migration):
- Remove `'doctor'` from `type Role` in `src/proxy.ts`
- DB enum `user_role` already only has `['patient', 'admin']` — no DB change needed

---

## Migration Dependency Graph

```
Migration 1 (E7 Indexes) ──── no deps, run first
  │
Migration 2 (analyses.outputType) ──── depends on 1 (adds column to analyses)
  │
Migration 3 (E8 Knowledge Seg) ──── depends on 1 (knowledge_base gets index + column)
  │
Migration 4 (E9 Agent Config) ──── no hard dep, but logically after 3
  │
Migration 5 (E11 Body Comp) ──── depends on 1 (documents gets index)
  │
Migration 6 (E12 Chat) ──── depends on 1 (FK to living_analyses, which is indexed)
```

**Safe parallel order:** Migrations 1 must be first. After 1, migrations 2-6 can be applied in any order (no cross-dependencies between them). Recommended sequential order matches the cycle map: 1 → 2 → 3 → 4 → 5 → 6.

---

## Index Summary — Before vs After

### Before v1.1 (current)
| Table | Indexed Columns |
|-------|----------------|
| `users` | PK, unique(`email`) |
| `password_reset_tokens` | PK, unique(`token`) |
| `medical_profiles` | PK, unique(`user_id`) |
| `documents` | PK |
| `snapshots` | PK, unique(`document_id`), idx(`user_id, created_at`) |
| `health_agents` | PK, unique(`name`) |
| `knowledge_base` | PK |
| `knowledge_embeddings` | PK, HNSW(`embedding`), GIN(`content_tsv`) |
| `living_analyses` | PK, unique(`user_id`) |
| `living_analysis_versions` | PK |
| `complete_analyses` | PK, unique(`document_id`) |
| `analyses` | PK |

### After v1.1
| Table | Added Indexes |
|-------|--------------|
| `documents` | **idx(`user_id`)** |
| `analyses` | **idx(`user_id`)**, **idx(`living_analysis_version_id`)** |
| `living_analysis_versions` | **idx(`living_analysis_id`)** |
| `knowledge_base` | **idx(`source`)** |
| `agent_knowledge` | **unique(`agent_id, article_id`)**, idx(`agent_id`), idx(`article_id`) |
| `body_composition_history` | **idx(`user_id, measured_at`)** |
| `chat_sessions` | **idx(`user_id`)**, **idx(`user_id, agent_id`)** |
| `chat_messages` | **idx(`session_id`)**, **idx(`session_id, created_at`)** |

**Total new indexes:** 13

---

## Schema Diagram — v1.1 (New/Modified in Bold)

```
users
  │
  ├── medical_profiles (1:1)
  │     └── + muscle_mass, visceral_fat_level, bone_mass, bmr, body_water_percentage
  │
  ├── documents (1:N)
  │     ├── snapshots (1:1)
  │     └── + idx(user_id)
  │
  ├── living_analyses (1:1)
  │     └── living_analysis_versions (1:N)
  │           └── + idx(living_analysis_id)
  │
  ├── analyses (1:N)
  │     └── + output_type, + idx(user_id), + idx(living_analysis_version_id)
  │
  ├── BODY_COMPOSITION_HISTORY (1:N) ← NEW
  │     └── idx(user_id, measured_at)
  │
  └── CHAT_SESSIONS (1:N) ← NEW
        ├── → health_agents (N:1)
        ├── → living_analyses (N:1, nullable)
        └── CHAT_MESSAGES (1:N) ← NEW
              └── idx(session_id, created_at)

health_agents
  ├── + model_config (JSONB)
  ├── + output_type (TEXT)
  ├── + output_schema (JSONB)
  │
  └── AGENT_KNOWLEDGE (M:N) ← NEW
        └── → knowledge_base

knowledge_base
  └── + is_global (BOOLEAN)
```

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scoped search slower than global | Medium | `idx_agent_knowledge_agent_id` + LIMIT keeps it fast. Monitor with EXPLAIN after deployment. |
| `chat_messages` grows unbounded | Low (short-term) | Rate limit 30/hr. Add archival policy (soft delete after 90 days) in v1.2 if needed. |
| `output_schema` invalid JSON Schema stored | Medium | Validate in admin form with `ajv` or `zod` before save. DB has no schema validation — intentional for flexibility. |
| `body_composition_history` conflicting with `medical_profiles` fields | Low | `medical_profiles` holds latest values (for analysis context). `body_composition_history` holds all historical records. Update profile on each new entry. |
| JSONB columns without indexes | Low | `model_config` and `output_schema` are read per-agent (by PK), never queried by content. No GIN index needed. |

---

*Schema design by Dara (AIOX Data Engineer) — 2026-04-08*
*Input: ADR v1.1 by Aria, current schema audit of 12 tables across 8 schema files*
