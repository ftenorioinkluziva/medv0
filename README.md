# SAMI — Sistema de Análise Médica Inteligente

> Plataforma de análise de saúde baseada em IA que processa documentos médicos e gera insights personalizados por meio de agentes especializados.

![Version](https://img.shields.io/badge/version-0.5.0-blue)
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

# Timeouts do pipeline multi-agente (opcional)
COMPLETE_ANALYSIS_TIMEOUT_MS="180000"
FOUNDATION_AGENT_TIMEOUT_MS="45000"
SPECIALIZED_AGENT_TIMEOUT_MS="45000"
SYNTHESIS_TIMEOUT_MS="45000"
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

- Workflow completo: `180000ms`
- Cada agente foundation: `45000ms`
- Cada agente specialized: `45000ms`
- Síntese final: `45000ms`

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
│   │   ├── agents/         # Motor de análise por agente
│   │   ├── core/           # generateMedicalAnalysis
│   │   ├── orchestrator/   # complete-analysis (flow completo)
│   │   └── rag/            # Vector search + context builder
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
