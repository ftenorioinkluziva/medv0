# SAMI — Sistema de Análise Médica Inteligente
## Product Requirements Document (PRD)

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-23 | 1.0 | Criação inicial | Morgan / SAMI Team |
| 2026-03-24 | 1.1 | Adicionado mapa de cycles e status de progresso | Fernando / Claude Code |

---

## 1. Goals

- Permitir que pacientes submetam documentos médicos (PDFs/imagens) para extração de dados, **sem armazenar os arquivos originais**
- Armazenar os dados extraídos como snapshots JSON estruturados para leitura rápida e comparação temporal
- Fornecer análises de saúde personalizadas cruzando histórico individual com base de conhecimento médico via RAG
- Apresentar a evolução temporal da saúde em texto conciso e compreensível (ex: "LDL ↑ 12% vs exame anterior")
- Garantir conformidade com LGPD — dados sensíveis nunca trafegam raw para APIs externas
- Tornar insights médicos complexos acessíveis para **pacientes** (público-alvo único, sem módulo clínico para médicos no MVP)

## 2. Background Context

O volume crescente de exames e dados de saúde gerados por pacientes raramente é cruzado de forma sistemática com evidências médicas atuais. Pacientes chegam a consultas sem uma visão consolidada de sua própria trajetória de saúde, e médicos dispõem de tempo limitado para análises profundas. O SAMI endereça esse gap ao funcionar como um agente inteligente que integra o histórico pessoal com conhecimento médico dinâmico.

A plataforma diferencia-se pelo uso de snapshots temporais — que transformam dados estáticos em narrativa de saúde evolutiva — e por um motor RAG alimentado por conteúdo médico atualizado (processado por bot n8n a partir de canais do YouTube e outras fontes), superando as limitações de modelos de linguagem estáticos.

---

## 3. Requirements

### Functional Requirements

- **FR1:** Upload de documentos médicos (PDF e imagens JPG/PNG) via interface mobile-first
- **FR2:** Extração dos dados via **Gemini 2.5 Flash (Vision AI)** usando `generateObject` com schema Zod; arquivo original descartado após extração
- **FR3:** Snapshots JSON armazenados com timestamp para comparação temporal entre exames
- **FR4:** Medical Profile do paciente inclui: dados demográficos (idade, sexo, peso, altura), pressão arterial, frequência cardíaca, sono, estresse, atividades físicas, hidratação, condições médicas, medicamentos, alergias, cirurgias, histórico familiar, tabagismo, álcool, suplementação, objetivos de saúde, cronobiologia (horário de sol, última refeição, exposição à luz artificial)
- **FR5:** Dashboard com evolução temporal de biomarcadores em texto conciso entre snapshots
- **FR6:** Agentes de IA especializados configuráveis via banco de dados (system prompts) analisam dados cruzando perfil + snapshot + contexto RAG
- **FR7:** Cada agente consulta base RAG de artigos médicos verificados para fundamentar análises com citações de fontes
- **FR8:** Relatório em Markdown estruturado: Resumo Executivo, Análise por Eixos Funcionais, Padrões e Pontos de Atenção, Insights/Hipóteses, Recomendações Educacionais, Disclaimer obrigatório
- **FR9:** Disclaimer obrigatório em todo relatório: *"Esta análise é gerada por IA para fins educacionais e NÃO substitui consulta médica profissional"*
- **FR10:** Autenticação de usuários — cada paciente acessa apenas seus próprios dados
- **FR11:** Histórico de análises anteriores consultável pelo usuário
- **FR12:** Endpoint `/api/admin/knowledge/auto-upload` para receber artigos do bot n8n e indexar no RAG (invisível para o paciente)

### Non-Functional Requirements

- **NFR1:** Dados de saúde criptografados em repouso e em trânsito (LGPD)
- **NFR2:** Arquivos originais de exames **NÃO** persistidos após extração
- **NFR3:** Dados pessoais identificáveis (nome, CPF, RG) removidos/mascarados dos outputs estruturados e de todos os payloads subsequentes de análise; nenhuma PII identificável é persistida no banco
- **NFR4:** Extração + estruturação ≤ 30s para documentos até 10 páginas
- **NFR5:** Geração de análise completa ≤ 60s (fase foundation + specialized + síntese)
- **NFR6:** Interface **mobile-first** — experiência otimizada para smartphones; desktop suportado como secondary
- **NFR7:** Agentes configuráveis via banco de dados — sem hardcode de system prompts no código

---

## 4. User Interface Design Goals

### Overall UX Vision
Interface clínica e acolhedora — transmite confiança médica sem ser fria. Dark mode por padrão. Linguagem simples para pacientes não-médicos. Feedback imediato em todas as ações.

### Key Interaction Paradigms
- Upload por câmera (foto do exame) ou galeria — fluxo de 1 toque
- Dashboard com indicadores de saúde em cards verticais
- Relatório consumível em scroll vertical otimizado para mobile
- Evolução temporal em texto, sem gráficos

### Core Screens
1. **Onboarding** (3 steps): disclaimer + aceite obrigatório → dados básicos do perfil → convite para primeiro upload
2. **Home / Dashboard** — resumo de saúde atual + biomarcadores alterados + CTA "Novo exame"
3. **Novo Exame** — upload (câmera/galeria) + feedback de processamento
4. **Meu Perfil Médico** — dados básicos e avançados editáveis
5. **Análise** — relatório Markdown com seções expansíveis
6. **Histórico** — lista de exames com evolução temporal em texto

### Accessibility
WCAG AA

### Branding
Paleta zinc/slate, acento azul médico, Geist Sans, dark mode padrão

### Target Platforms
**Mobile-first PWA** (iOS e Android) — Web responsivo como secundário. React Native como fase futura pós-MVP.

---

## 5. Technical Assumptions

### Repository Structure
Monorepo

### Service Architecture
Monolith — Next.js 16 App Router (API Routes + Server Actions + frontend)

### Infrastructure
- Deploy: **VPS Hetzner** via containers **Docker**
- Database: **Neon Postgres** (já provisionado)
- ORM: **Drizzle ORM**
- Vetorial: **pgvector** (schema `knowledge_embeddings`, vector 768 dimensões)

### AI Stack
- Extração de documentos: **Gemini 2.5 Flash** (Vision API)
- Análise e geração de relatório: **Gemini 2.5 Flash** (texto)
- Embeddings: **text-embedding-004** (Google, 768 dims)
- SDK: **Vercel AI SDK** (`generateObject`, `generateText`, `embedMany`)

### Auth
NextAuth v5 (Credentials provider — email/senha + bcrypt). Reset de senha via Resend.

### UI
- Mobile-first PWA
- Shadcn UI + Tailwind CSS v4 + Lucide icons
- Dark mode padrão
- Evolução temporal em texto conciso — sem gráficos

### n8n Integration
- n8n (externo, Hetzner) alimenta RAG via `POST /api/admin/knowledge/auto-upload`
- Endpoint protegido por `x-api-key` header (`KNOWLEDGE_API_KEY` env var)
- Payload: artigo Markdown + metadados → chunking → embeddings → pgvector

### Testing
- **Vitest** — testes unitários e integração (critério de DoD em todas as stories)
- **Playwright (MCP)** — testes E2E em viewport mobile (390px)
- **Context7 (MCP)** — documentação atualizada de todas as libs durante desenvolvimento
- Lint + Typecheck obrigatórios antes de marcar story como done

---

## 6. Epic List

| # | Linear | Epic | Goal |
|---|--------|------|------|
| E0 | BLA-35 | Infrastructure & DevOps | Docker, Hetzner deploy, CI/CD — paralelo com E1 |
| E1 | BLA-29 | Foundation & Auth | Setup, NextAuth v5, Medical Profile, Onboarding |
| E2 | BLA-30 | Document Ingestion | Upload, Gemini Vision, snapshot JSON |
| E3 | BLA-31 | Knowledge Base API | pgvector, endpoint n8n, embeddings |
| E4 | BLA-32 | AI Analysis Engine | Multi-agente, RAG, relatório Markdown |
| E5 | BLA-33 | Mobile Experience & History | Dashboard, histórico, evolução temporal, PWA |
| E6 | BLA-34 | Admin Panel | CRUD agentes, knowledge base, usuários |

---

## 7. Epic Details

### E0 — Infrastructure & DevOps (BLA-35)
Setup Docker, deploy VPS Hetzner, CI/CD GitHub Actions. Corre em paralelo com E1.

---

### E1 — Foundation & Auth (BLA-29)

**Goal:** Usuário consegue criar conta, fazer login, preencher Medical Profile e ser guiado pelo onboarding.

#### Story 1.1 — Project Setup (BLA-36)
> Como desenvolvedor, quero Next.js 16 configurado com Drizzle ORM, Neon Postgres e pgvector.

**Acceptance Criteria:**
1. Next.js 16, TypeScript strict, Shadcn UI, Tailwind CSS v4 inicializados
2. Drizzle ORM conectado ao Neon Postgres
3. pgvector habilitado no banco
4. Schema base criado: `users`, `medical_profiles`
5. `pnpm dev` roda sem erros
6. Vitest configurado — smoke test passa

#### Story 1.2 — Authentication + Reset de Senha (BLA-37)
> Como paciente, quero me registrar, fazer login e recuperar minha senha por email.

**Acceptance Criteria:**
1. NextAuth v5 com Credentials (email/senha + bcrypt)
2. Schema `users`: id, email, passwordHash, role, onboardingCompleted, isActive, createdAt
3. Reset de senha: link via Resend → token expira em 1h → nova senha
4. Rotas protegidas redirecionam para login
5. Session com `user.id`, `user.email`, `user.role`
6. Telas login/registro/reset mobile-first

#### Story 1.3 — Medical Profile (Dados Básicos) (BLA-38)
> Como paciente, quero preencher meus dados básicos de saúde.

**Acceptance Criteria:**
1. Schema `medical_profiles` com campos obrigatórios: idade, sexo, peso, altura, pressão arterial, objetivos de saúde
2. Campos opcionais: condições, medicamentos, alergias, histórico familiar
3. Validação com Zod — campos obrigatórios não podem estar vazios
4. Perfil vinculado ao `user.id` — isolamento garantido

#### Story 1.4 — Medical Profile (Dados Avançados) (BLA-39)
> Como paciente, quero completar meu perfil com dados de estilo de vida e cronobiologia.

**Acceptance Criteria:**
1. Campos adicionados: atividades físicas (JSONB array), sono, hidratação, estresse, tabagismo, álcool, suplementação
2. Cronobiologia: horário solar, última refeição, exposição à luz artificial
3. Todos os campos opcionais — não bloqueiam análise

#### Story 1.5 — Onboarding Flow (BLA-40)
> Como novo paciente, quero ser guiado por um onboarding simples ao criar minha conta.

**Acceptance Criteria:**
1. Step 1: Disclaimer explícito com checkbox de aceite obrigatório
2. Step 2: Campos obrigatórios do perfil básico
3. Step 3: Convite para primeiro upload (pulável)
4. Flag `onboardingCompleted = true` após conclusão — exibido apenas uma vez

---

### E2 — Document Ingestion (BLA-30)

**Goal:** Exame enviado pelo paciente é processado, dados estruturados salvos, arquivo descartado.

#### Story 2.1 — Upload Interface (BLA-41)
> Como paciente, quero enviar um exame médico pelo meu celular.

**Acceptance Criteria:**
1. Interface mobile-first: câmera (foto direta) e galeria/arquivos
2. Aceita PDF e imagens (JPG, PNG) até 20MB
3. Preview antes do envio, feedback de progresso
4. Arquivo nunca persiste no servidor

#### Story 2.2 — Extração via Gemini Vision (BLA-42)
> Como sistema, quero extrair dados de documento médico via Gemini 2.5 Flash.

**Acceptance Criteria:**
1. PDFs via `pdf-parse`; imagens diretamente como multimodal
2. Dados pessoais identificáveis (nome, CPF, RG) removidos ou mascarados do output estruturado imediatamente após extração, antes de persistência e antes de qualquer etapa de análise
3. `generateObject` com Zod schema — JSON válido garantido
4. Output: `documentType`, `patientInfo` (sem PII), `overallSummary`, `modules[]`
5. Cada módulo: `moduleName`, `category`, `status`, `summary`, `parameters[]`
6. Fallback estruturado em caso de erro — não quebra o fluxo
7. `temperature: 0.1` para precisão numérica

#### Story 2.3 — Persistência do Snapshot (BLA-43)
> Como paciente, quero que meus dados extraídos sejam salvos com data e hora.

**Acceptance Criteria:**
1. Schema `documents`: id, user_id, documentType, examDate, extractedAt, overallSummary
2. Schema `snapshots`: id, document_id, user_id, structuredData (JSONB), createdAt
3. Transação única: insert document + insert snapshot
4. Arquivo original descartado após persistência

---

### E3 — Knowledge Base API (BLA-31)

**Goal:** RAG populado e pesquisável antes da engine de análise entrar em operação.

#### Story 3.1 — Schema & Busca Vetorial (BLA-44)
> Como sistema, quero schema da knowledge base e busca por similaridade.

**Acceptance Criteria:**
1. Schema `knowledge_base`: id, title, content, summary, source, author, category, subcategory, tags, language, is_verified, usage_count
2. Schema `knowledge_embeddings`: id, article_id, chunk_index, content, embedding (vector 768)
3. `searchKnowledge(query, topK)` retorna chunks por cosine distance
4. Índice HNSW criado para performance
5. `usage_count` incrementado atomicamente

#### Story 3.2 — Endpoint auto-upload (BLA-45)
> Como bot n8n, quero enviar artigos médicos para o sistema via API.

**Acceptance Criteria:**
1. `POST /api/admin/knowledge/auto-upload` — header `x-api-key`
2. Payload: title, content, summary, source, author, category, subcategory, tags, language
3. Chunking ~500 tokens com overlap ~50 tokens
4. `embedMany()` para batch de chunks
5. Upsert: duplicado (title + source) atualizado

---

### E4 — AI Analysis Engine (BLA-32)

**Goal:** Análise completa gerada com relatório estruturado, RAG e disclaimer.

#### Story 4.1 — Health Agents (Configuração) (BLA-46)
> Como admin, quero configurar agentes de IA especializados no banco.

**Acceptance Criteria:**
1. Schema `health_agents`: id, name, specialty, description, systemPrompt, analysisRole, isActive
2. Seed: Medicina Integrativa (foundation), Endocrinologia (foundation), Nutrição (specialized), Exercício (specialized), Cardiologia (specialized)
3. `getActiveAgentsByRole(role)` — query helper

#### Story 4.2 — Motor de Análise Multi-Agente (BLA-47)
> Como paciente, quero que múltiplos agentes analisem meus exames de forma coordenada.

**Acceptance Criteria:**
1. Fase 1: Foundation agents sequencialmente (snapshot sem PII + Medical Profile + RAG)
2. Fase 2: Specialized agents em paralelo (`Promise.all`) + output dos foundation
3. Fase 3: Síntese consolidada
4. PII removido em todos os payloads
5. Schema `analyses` + `complete_analyses`
6. Timeout hard de 60s para o workflow completo, com cancelamento gracioso por agente quando necessário

#### Story 4.3 — Relatório Estruturado (BLA-48)
> Como paciente, quero receber um relatório claro sobre minha saúde.

**Acceptance Criteria:**
1. Seções obrigatórias: Resumo Executivo, Análise por Eixos, Padrões, Insights, Recomendações
2. Disclaimer obrigatório injetado programaticamente
3. Biomarcadores destacados: ↑ alto / ↓ baixo / ⚠ atenção
4. Citações do RAG com fonte
5. Persistido em `complete_analyses.reportMarkdown`

---

### E5 — Mobile Experience & History (BLA-33)

**Goal:** Experiência completa e fluida no smartphone.

#### Story 5.1 — Dashboard & Home (BLA-49)
> Como paciente, quero ver um resumo do meu estado de saúde ao abrir o app.

**Acceptance Criteria:**
1. Último exame + biomarcadores alterados + data da última análise
2. CTA "Enviar novo exame" sempre visível
3. Estado vazio com CTA para novo usuário
4. Skeleton loader durante carregamento

#### Story 5.2 — Histórico & Evolução Temporal (BLA-50)
> Como paciente, quero ver meu histórico e como meus indicadores mudaram.

**Acceptance Criteria:**
1. Lista de exames ordenada por data (mais recente primeiro)
2. Evolução em texto: "LDL ↑ 12% vs exame anterior"
3. Variação < 5% = "estável"; ≥ 5% = ↑ ou ↓
4. Navegação para relatório completo

#### Story 5.3 — PWA (BLA-51)
> Como paciente, quero instalar o SAMI no meu celular como um app.

**Acceptance Criteria:**
1. `manifest.json`: nome, ícones (192x192, 512x512), display standalone
2. Service worker para cache de assets estáticos
3. Lighthouse PWA score ≥ 80

---

### E6 — Admin Panel (BLA-34)

**Goal:** Admin gerencia agentes, knowledge base e usuários sem acesso de pacientes.

#### Story 6.1 — Auth de Admin & Rotas Protegidas (BLA-52)
> Como admin, quero acessar painel separado com autenticação por role.

**Acceptance Criteria:**
1. `/admin/*` protegido — redirect se `role !== 'admin'`
2. Layout separado com nav lateral
3. Usuário admin criado via seed apenas

#### Story 6.2 — CRUD de Agentes (BLA-53)
> Como admin, quero criar, editar e ativar/desativar agentes de IA.

**Acceptance Criteria:**
1. Listagem com toggle ativo/inativo
2. Formulário com validação de systemPrompt (mín. 50 chars)

#### Story 6.3 — Gestão da Knowledge Base (BLA-54)
> Como admin, quero visualizar e buscar artigos indexados no RAG.

**Acceptance Criteria:**
1. Listagem com usage_count e is_verified
2. Busca por título/categoria
3. Remoção com cascade de embeddings

#### Story 6.4 — Gestão de Usuários (BLA-55)
> Como admin, quero visualizar usuários e suas atividades.

**Acceptance Criteria:**
1. Listagem com total de exames e análises
2. Desativação de conta — usuário desativado não faz login
3. Filtro por role

---

## 8. Development Progress

### Status em 2026-03-24

| Story | Linear | Status | Cycle | Branch |
|-------|--------|--------|-------|--------|
| 1.1 — Project Setup | BLA-36 | ✅ Done | 1 | merged (#1) |
| 1.2 — Authentication + Reset | BLA-37 | ✅ Done | 1 | PR aberto (#2) |
| 1.3 — Medical Profile Básico | BLA-38 | 📋 Backlog | 1 | — |
| 1.4 — Medical Profile Avançado | BLA-39 | 📋 Backlog | 1 | — |
| 1.5 — Onboarding Flow | BLA-40 | 📋 Backlog | 1 | — |

---

## 9. Cycle Map

### Cycle 1 — E1: Foundation & Auth
**Período:** 30/03/2026 → 06/04/2026
**Objetivo:** Completar toda a base de autenticação, Medical Profile e onboarding

| Issue | Story | Status |
|-------|-------|--------|
| BLA-36 | 1.1 — Project Setup | ✅ Done |
| BLA-37 | 1.2 — Authentication + Reset | ✅ Done |
| BLA-38 | 1.3 — Medical Profile Básico | 📋 Todo |
| BLA-39 | 1.4 — Medical Profile Avançado | 📋 Todo |
| BLA-40 | 1.5 — Onboarding Flow | 📋 Todo |

### Cycle 2 — E2 + E3: Document Ingestion + Knowledge Base
**Período:** 06/04/2026 → 13/04/2026
**Objetivo:** Upload de exames, extração Gemini, snapshot + RAG populado

| Issue | Story | Status |
|-------|-------|--------|
| BLA-41 | 2.1 — Upload Interface | 📋 Backlog |
| BLA-42 | 2.2 — Extração Gemini Vision | 📋 Backlog |
| BLA-43 | 2.3 — Persistência Snapshot | 📋 Backlog |
| BLA-44 | 3.1 — Schema & Busca Vetorial | 📋 Backlog |
| BLA-45 | 3.2 — Endpoint auto-upload | 📋 Backlog |

### Cycle 3 — E4 + E5: AI Engine + Mobile Experience
**Período:** A definir
**Objetivo:** Motor multi-agente, relatório e experiência mobile completa

### Cycle 4 — E0 + E6: DevOps + Admin Panel
**Período:** A definir
**Objetivo:** Deploy Hetzner, CI/CD, painel admin

---

## 10. Next Steps

### Próxima action imediata
1. Merge PR #2 (BLA-37 — Authentication)
2. `@dev *start BLA-38` — Medical Profile Básico

### Para o Dev
```bash
@dev *start BLA-38   # Medical Profile Básico
@dev *start BLA-39   # Medical Profile Avançado (após 1.3)
@dev *start BLA-40   # Onboarding Flow (após 1.3 e 1.2)
```

---

*Documento gerado por Morgan (AIOX PM Agent) em 2026-03-23*
*Atualizado em 2026-03-24 — Cycles mapeados, progresso registrado*
*Linear Project: [medV0](https://linear.app/blackboxinovacao/project/medv0-afad56960ac8/overview)*
