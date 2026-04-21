# SAMI — Sistema de Análise Médica Inteligente

> Plataforma de análise de saúde baseada em IA que processa documentos médicos e gera insights personalizados por meio de agentes especializados.

![Version](https://img.shields.io/badge/version-0.7.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![License](https://img.shields.io/badge/license-private-red)

---

## Visão Geral

O SAMI permite que pacientes submetam exames médicos (PDFs e imagens) para extração automática de dados, armazenamento como snapshots temporais e análise por um motor multi-agente de IA. A plataforma cruza o histórico individual do paciente com uma base de conhecimento médico via RAG, gerando relatórios estruturados acessíveis para não-médicos.

**Princípios-chave:**
- Arquivos originais **não são armazenados** — apenas o snapshot JSON extraído
- Dados sensíveis (PII) são mascarados antes de qualquer análise
- Conformidade com LGPD
- Todo relatório inclui disclaimer obrigatório de uso educacional

---

## Funcionalidades

| Feature | Descrição |
|---------|-----------|
| **Upload de Documentos** | PDFs e imagens (JPG/PNG) via interface mobile-first |
| **Extração Vision AI** | Gemini 2.5 Flash extrai dados estruturados; arquivo original descartado |
| **Snapshots Temporais** | Histórico de exames com comparação evolutiva de biomarcadores |
| **Multi-Agent Analysis** | Foundation agents (sequencial) → Specialized agents (paralelo) → Síntese |
| **RAG Knowledge Base** | Base de artigos médicos verificados, alimentada via n8n |
| **Medical Profile** | Dados demográficos, condições, medicamentos, estilo de vida e mais |
| **Relatório Estruturado** | Markdown com resumo executivo, eixos funcionais, recomendações |
| **Auth & RBAC** | Roles: `patient`, `doctor`, `admin` via NextAuth v5 |
| **Multi-Provider AI** | Suporte a Google Gemini, OpenAI e Anthropic via factory `resolveModel` |
| **Vercel AI Gateway** | Proxy opcional para todos os providers via `AI_GATEWAY_API_KEY`; ativa com zero mudança de código |
| **Modelos Configuráveis** | `DOCUMENT_EXTRACTION_MODEL`, `SYNTHESIS_MODEL`, `GOOGLE_EMBEDDING_MODEL` configuráveis via env |
| **Model Config por Agente** | topP, topK, seed, frequencyPenalty, presencePenalty configuráveis por agente via admin |
| **Output Estruturado** | Agentes podem gerar JSON tipado via `generateObject` + JSON Schema dinâmico |
| **Prompts Especializados** | Cada agente recebe prompt customizado por especialidade (exercício, nutrição, cardiologia, endocrinologia, neurociência) |

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Drizzle ORM + pgvector |
| Auth | NextAuth v5 |
| AI | Vercel AI SDK + Google Gemini 2.5 Flash |
| UI | shadcn/ui + Radix + Tailwind CSS v4 |
| Testing | Vitest + Playwright |
| Package Manager | pnpm |

---

## Arquitetura Multi-Agente

```
Upload de Documento
       │
       ▼
Extração (Gemini Vision)
       │
       ▼
Snapshot JSON ──────────────────────────────┐
                                            │
Medical Profile ────────────────────────────┤
                                            │
RAG Knowledge Base ─────────────────────────┤
                                            ▼
                           ┌─────────────────────────┐
                           │   Foundation Agents      │
                           │   (sequential)           │
                           └──────────┬──────────────┘
                                      │
                           ┌──────────▼──────────────┐
                           │   Specialized Agents     │
                           │   (parallel)             │
                           └──────────┬──────────────┘
                                      │
                           ┌──────────▼──────────────┐
                           │   Synthesis + Report     │
                           └─────────────────────────┘
```

Todos os agentes são configurados via banco de dados (`health_agents` table) — sem hardcode de system prompts no código.

Cada agente suporta:
- **`modelConfig`** — parâmetros avançados do provider (topP, topK, seed, frequencyPenalty, presencePenalty)
- **`outputType`** — `'text'` (Markdown padrão) ou `'structured'` (JSON via `generateObject`)
- **`outputSchema`** — JSON Schema dinâmico para output estruturado
- **`provider`** + **`modelId`** — roteamento para Google, OpenAI ou Anthropic via `resolveModel`

---

## Pré-requisitos

- Node.js 18+
- pnpm
- PostgreSQL com extensão `pgvector`
- Conta Google AI (Gemini)

---

## Instalação

```bash
# Clonar repositório
git clone https://github.com/ftenorioinkluziva/medv0.git
cd medv0

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env.local
```

Editar `.env.local`:

```env
DATABASE_URL="postgresql://..."
GOOGLE_GENERATIVE_AI_API_KEY="..."
NEXTAUTH_SECRET="..."        # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Modelos configuráveis (formato "provider/model")
DOCUMENT_EXTRACTION_MODEL="google/gemini-2.5-flash"
SYNTHESIS_MODEL="google/gemini-2.5-flash"
GOOGLE_EMBEDDING_MODEL="gemini-embedding-001"

# Vercel AI Gateway (opcional — roteia todos os providers pelo gateway)
AI_GATEWAY_API_KEY="..."
AI_GATEWAY_BASE_URL="https://ai-gateway.vercel.sh/v1"

# Timeouts do pipeline multi-agente (opcional)
COMPLETE_ANALYSIS_TIMEOUT_MS="600000"   # 10 min (hard limit)
FOUNDATION_AGENT_TIMEOUT_MS="180000"    # 3 min por agente
SPECIALIZED_AGENT_TIMEOUT_MS="180000"   # 3 min por agente
SYNTHESIS_TIMEOUT_MS="120000"           # 2 min
```

---

## Database Setup

```bash
# Gerar migrações a partir do schema
pnpm db:generate

# Aplicar migrações
pnpm db:migrate

# Popular agentes de saúde
pnpm db:seed

# Ou tudo de uma vez
pnpm db:setup
```

**Workflow de schema:** Modificar `src/lib/db/schema/` → `pnpm db:generate` → `pnpm db:migrate`

**Importante:** `pnpm db:seed` depende de `DATABASE_URL` disponível no ambiente para popular `health_agents`. Sem os agentes ativos, a geração de relatórios não inicia corretamente.

---

## Fluxo de Análise

O início da análise usa a rota de página `/app/analyses/run`, que dispara o POST em `/api/analyses/run` e redireciona para `/app/analyses/{completeAnalysisId}` quando o processamento é criado.

Proteções implementadas no fluxo:

- IDs inválidos em `/app/analyses/[id]` são rejeitados antes de consultar o banco
- `documentId` inválido em `/app/analyses/run` exibe erro amigável em vez de quebrar a página
- O orquestrador falha explicitamente se não houver agentes `foundation` e `specialized` ativos
- Os timeouts por fase podem ser ajustados por variáveis de ambiente


### Timeouts atuais

- Workflow completo (hard limit): `600000ms` (10 minutos)
- Cada agente foundation: `180000ms` (3 minutos)
- Cada agente specialized: `180000ms` (3 minutos)
- Síntese final: `120000ms` (2 minutos)

Todos os timeouts por fase são independentes e menores que o hard limit, garantindo que o orçamento total não seja consumido em uma única fase.

---

## Troubleshooting

### Relatório não foi gerado

Se a página de relatório mostrar "Não foi possível gerar o relatório", verifique:

1. Se a tabela `health_agents` foi populada com `pnpm db:seed`
2. Se existem agentes ativos `foundation` e `specialized`
3. Se `DATABASE_URL` está carregada corretamente no ambiente
4. Se os timeouts do pipeline estão adequados para o ambiente atual

### `pnpm db:migrate` falha sem stack útil

Se o `drizzle-kit migrate` falhar só com `ELIFECYCLE`, o problema pode estar no estado da tabela `drizzle.__drizzle_migrations`, e não no SQL da migration em si.

### `invalid input syntax for type uuid`

Esse erro normalmente indica que uma rota dinâmica recebeu um valor textual onde o backend esperava UUID. O fluxo atual de `/app/analyses/run` já protege esse caso para análises.

---

## Comandos

```bash
# Desenvolvimento
pnpm dev              # Servidor local (localhost:3000)

# Qualidade
pnpm lint             # ESLint
pnpm typecheck        # TypeScript (tsc --noEmit)
pnpm build            # Build de produção

# Testes
pnpm test             # Vitest (unit)
pnpm test:coverage    # Cobertura
pnpm test:e2e         # Playwright (E2E)

# Database
pnpm db:studio        # GUI do banco (Drizzle Studio)
pnpm db:push          # Push direto do schema (dev only)
```

---

## Estrutura do Projeto

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Rotas protegidas (dashboard, profile, análises)
│   ├── (auth)/             # Autenticação (login, register, reset)
│   ├── admin/              # Painel admin
│   └── api/                # Route Handlers
├── lib/
│   ├── ai/
│   │   ├── agents/         # Motor de análise + prompts especializados por agente
│   │   ├── core/           # resolveModel, ai-gateway (shared), generateMedicalAnalysis
│   │   ├── orchestrator/   # complete-analysis, living-analysis, pipeline (shared)
│   │   └── rag/            # Vector search + context builder + embedding model
│   ├── auth/               # NextAuth config
│   ├── db/
│   │   ├── schema/         # Drizzle schema
│   │   └── client.ts       # DB client
│   └── documents/          # Processamento (pdf-parse + Vision)
docs/
├── prd.md                  # Product Requirements Document
└── stories/                # Development stories
```

---

## Disclaimer

> **Esta plataforma é destinada a fins educacionais e informativos.**
> Toda análise gerada pela IA inclui o aviso: *"Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional."*

---

## Changelog

### v0.7.0 — 2026-04-18
- Vercel AI Gateway: proxy opcional para todos os providers via `AI_GATEWAY_API_KEY`
- Shared `ai-gateway.ts` module — elimina setup duplicado entre resolve-model e embedding-model
- Modelos configuráveis via env: `DOCUMENT_EXTRACTION_MODEL`, `SYNTHESIS_MODEL`, `GOOGLE_EMBEDDING_MODEL`
- Prompts especializados por agente (`prompts.ts`): exercício, nutrição, cardiologia, endocrinologia, neurociência
- Timeouts por fase corrigidos: foundation/specialized 180s, synthesis 120s (vs hard limit 600s)
- Acessibilidade: `aria-controls` + painéis sempre montados com `hidden={!open}` no report UI
- React keys únicos em `ReportView` (`special-` e `structured-` prefixes)

### v0.6.0 — 2026-04-14
- Story 9.2: Model Config & Output Schema por agente (modelConfig, outputSchema, outputType)
- Story 9.1: Multi-provider support (resolveModel factory — Google, OpenAI, Anthropic)
- Story 8.2: Admin UI — associação de agentes a artigos da knowledge base
- Story 8.1: Living Analysis (análise contínua com versionamento)

### v0.5.0 — 2026-03-31
- Story 4.3: Relatório Estruturado em Markdown
- Story 4.2: Motor de Análise Multi-Agente
- Story 4.1: Health Agents configurados via banco
- Story 3.2: Endpoint auto-upload da knowledge base
- Story 3.1 + 6.1: RAG Knowledge Base + Auth Admin
- Story 2.3: Persistência de Snapshot
- Story 2.2: Extração via Gemini Vision
- Story 1.x: Pipeline de upload e processamento
- Story 0.x: Foundation (auth, DB, testes, E2E)
