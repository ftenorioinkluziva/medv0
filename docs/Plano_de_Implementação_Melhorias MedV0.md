## 📋 Plano de Implementação - Melhorias MedV0

### 🎯 **Visão Geral**

**Objetivo:** Implementar melhorias críticas identificadas na análise, focando em qualidade de código, performance e experiência do usuário.

**Escopo:** Correções críticas + melhorias de médio impacto, evitando mudanças disruptivas.

**Duração Estimada:** 2-3 semanas de desenvolvimento.

**Equipe:** 1 desenvolvedor full-stack.

---

### 📌 **Status Atual (2026-04-24)**

- ✅ `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passando
- ✅ `pnpm test` volta a encerrar normalmente após isolar temporariamente `tests/unit/analyses-run-page.test.tsx` (arquivo com execução travando no collect)
- ✅ Ajustes commitados e enviados para `origin/feat/improvements-phase1` (`9d42b99`, `11f649b`)
- ✅ Fase 1.1 e 1.2 concluídas
- ✅ Fase 1.3 concluída (uso de logger central em vez de `console.*` no código de app)
- ✅ Fase 2.1 concluída (lazy loading no dashboard)
- ✅ Fase 2.2 concluída (code splitting aplicado em `/admin`, `/admin/users`, `/admin/agents`, `/admin/knowledge`, `/admin/agents/new`, `/admin/agents/[id]/edit`)
- ✅ Fase 2.3 concluída (auditoria de mídia finalizada; uso de `next/image` com `sizes` no upload)
- ✅ Fase 3.1 concluída (rate limiting em chat, upload e análise)
- ✅ Fase 3.2 concluída (validação server-side + sanitização de nome + timeout de extração no upload)
- ✅ Fase 3.3 concluída (validações Zod aplicadas nas rotas com entrada de params/body/query)
- 🔄 Fase 4.1 em andamento (feedback inline de erro no upload + ação de retry no fluxo de análise)
- 🔄 Fase 4.2 em andamento (utilitário `errorResponse` aplicado em chat, upload, análises e auto-upload; hook `useErrorHandler` criado)
- 🔄 Fase 4.3 em andamento (melhorias de `aria-live` e feedback acessível em upload/análises)
- ✅ Fase 5.1 concluída (novos testes unitários para `errorResponse`, `useErrorHandler`, fluxo de análise e upload)
- 🔄 Fase 5.2 em andamento
- ✅ Ajustes de dashboard concluídos (Altura e Massa Magra no perfil, badge de status "Processado" padronizada, "Ver exame" em Últimos Documentos)
- ✅ Card "Estado de Saúde" ajustado para exibir apenas seção Resumo + link "Ver última análise"
- ✅ Tela de análise com rastreabilidade de origem (exibe `Arquivo-base` da versão atual)
- ✅ Robustez do produto de refeições: parser tolerante no frontend + validação de completude e retry automático no backend
- ✅ Timeout de upload ampliado (`maxDuration=180s`, extração `120s`, timeout cliente `+20s`)
- ✅ Novos ajustes commitados e enviados para `origin/feat/improvements-phase1` (`be5931e`)
- ⚠️ Pendência técnica: investigar e corrigir `tests/unit/analyses-run-page.test.tsx` (atualmente excluído em `vitest.config.ts` para manter pipeline estável)
- ⏳ Fases 6 e 7 pendentes

---

### ✅ **Checklist Zod por rota (auditado)**

- `/api/chat` — body validado (`ChatSchema`)
- `/api/documents/upload` — categoria do `FormData` validada (`z.enum`)
- `/api/documents/[id]/category` — params + body validados
- `/api/analyses/run` — body validado (`RunAnalysisSchema`)
- `/api/analyses/[id]` — params validados (UUID)
- `/api/analyses/[id]/status` — params validados (UUID)
- `/api/admin/knowledge/auto-upload` — query (`source`) + body validados

---

### 📝 **Últimas Entregas (2026-04-24)**

- Logger central aplicado no app (`src/lib/observability/logger.ts`) e substituição de `console.*` em rotas/libs principais
- Padronização de erro com `errorResponse` em APIs críticas (`chat`, `upload`, `analyses`, `auto-upload`)
- Hardening de upload com `upload-validation` (tamanho, MIME/signature, sanitização de nome e timeout de extração)
- Melhorias de UX/A11y no upload e no fluxo de iniciar análise (retry, `aria-live`, `aria-busy`, feedback inline)
- `useErrorHandler` adicionado e coberto por teste unitário
- Estabilização da suíte Vitest: `pnpm test` encerra normalmente com exclusão temporária do teste problemático de `analyses-run-page`
- Dashboard atualizado com métricas de composição corporal (Altura e Massa Magra), resumo de saúde focado e links de navegação corretos
- Página `/app/analyses/[id]` agora mostra o nome do arquivo de origem da versão atual para facilitar rastreio
- Plano Alimentar: renderização tolerante a formatos reais do payload (`foods`, `macros` string, `fat/fats`) em `src/app/app/products/meals/page.tsx`
- Geração de produto `meals` fortalecida em `src/lib/ai/orchestrator/living-analysis.ts` com verificação de refeições obrigatórias e segunda tentativa automática em resposta incompleta
- Configuração de timeout centralizada em `src/lib/documents/upload-config.ts` e aplicada na rota `src/app/api/documents/upload/route.ts`
- Diagnóstico de consistência no banco: prompts/schemas de `product_generator` divergentes do código local identificados e documentados para correção manual

---

### 📅 **Fase 1: Correções Críticas (1-2 dias)**

**Prioridade: ALTA** - Impacto imediato na qualidade e build

#### Tarefa 1.1: Resolver Linting Issues
```bash
# Comando para executar
pnpm lint

# Arquivos afetados
src/app/app/dashboard/dashboard-content.tsx

# Ações necessárias
- Remover import não utilizado: DocumentWithHistory
- Remover import não utilizado: EvolutionBadge
- Verificar se imports são realmente não utilizados
```

#### Tarefa 1.2: Corrigir TypeScript Issues
```bash
# Comando para executar
pnpm typecheck

# Problema identificado
- Tipos Vitest não reconhecidos nos testes

# Soluções possíveis
1. Adicionar @types/vitest ao package.json
2. Ou configurar types no tsconfig.json
3. Ou usar /// <reference types="vitest/globals" />
```

#### Tarefa 1.3: Remover Console Statements
```bash
# Comando para localizar
grep -r "console\." src/ --include="*.ts" --include="*.tsx"

# Ações necessárias
- Substituir console.error por logger estruturado
- Remover console.log de produção
- Manter apenas console.error em catch blocks críticos
```

---

### 🚀 **Fase 2: Performance & Bundle (2-3 dias)**

**Prioridade: ALTA** - Impacto direto na experiência do usuário

#### Tarefa 2.1: Implementar Lazy Loading
```typescript
// Em src/app/app/dashboard/page.tsx
import { lazy, Suspense } from 'react'
const DashboardContent = lazy(() => import('./dashboard-content'))

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
```

#### Tarefa 2.2: Code Splitting por Rotas Admin
```typescript
// Em src/app/admin/layout.tsx ou page.tsx
import { lazy, Suspense } from 'react'

const AdminDashboard = lazy(() => import('./dashboard/page'))
const AdminUsers = lazy(() => import('./users/page'))
// ... outros componentes admin

// Implementar lazy loading para todas as rotas /admin/*
```

#### Tarefa 2.3: Otimizar Imagens
```typescript
// Verificar uso de next/image em todos os componentes
// Adicionar priority para imagens above-the-fold
// Implementar placeholder="blur" onde apropriado
```

---

### 🔒 **Fase 3: Segurança & Validações (1-2 dias)**

**Prioridade: ALTA** - Proteção contra vulnerabilidades

#### Tarefa 3.1: Implementar Rate Limiting
```typescript
// Instalar dependências
pnpm add @upstash/rate-limit

// Implementar em APIs públicas
// /api/chat/route.ts
// /api/documents/upload/route.ts
// /api/analyses/run/route.ts
```

#### Tarefa 3.2: Melhorar Segurança de Upload
```typescript
// Em src/app/api/documents/upload/route.ts
- Validar tamanho de arquivo server-side
- Verificar tipo MIME
- Sanitizar nomes de arquivo
- Adicionar timeout para processamento
```

#### Tarefa 3.3: Revisar Validações Zod
```typescript
// Verificar se todas as APIs usam validações Zod
// Adicionar validações mais rigorosas onde necessário
// Implementar sanitização de input
```

---

### 🎨 **Fase 4: UX/UI Improvements (2-3 dias)**

**Prioridade: MÉDIA** - Melhorar experiência do usuário

#### Tarefa 4.1: Melhorar Loading States
```typescript
// Implementar skeletons consistentes
// Adicionar loading indicators para operações longas
// Melhorar feedback visual durante uploads
```

#### Tarefa 4.2: Error Handling Padronizado
```typescript
// Criar hook useErrorHandler
// Padronizar mensagens de erro
// Implementar error boundaries
// Melhorar UX de estados de erro
```

#### Tarefa 4.3: Acessibilidade
```typescript
// Verificar contraste de cores
// Melhorar focus management
// Adicionar aria-labels onde necessário
// Testar com screen readers
```

---

### 🧪 **Fase 5: Testing & Quality (2-3 dias)**

**Prioridade: MÉDIA** - Garantir qualidade e prevenibilidade de bugs

#### Tarefa 5.1: Expandir Test Coverage
```bash
# Meta: Aumentar cobertura de 30% para 70%+

# Adicionar testes para:
- Componentes críticos (dashboard, upload)
- Custom hooks
- Utilitários
- Validações Zod
```

#### Tarefa 5.2: Testes de Integração
```typescript
// Testes para fluxos completos
- Upload → processamento → análise
- Autenticação → dashboard
- Formulários → API → banco
```

#### Tarefa 5.3: Testes E2E Expandidos
```typescript
// Em tests/e2e/
// Adicionar cenários de erro
// Testar acessibilidade
// Performance tests com Playwright
```

---

### 🏗️ **Fase 6: Arquitetura & Refatoração (2-3 dias)**

**Prioridade: MÉDIA** - Melhorar manutenibilidade

#### Tarefa 6.1: Component Splitting
```typescript
// Quebrar dashboard-content.tsx em:
// - ProfileCard.tsx
// - RecentDocuments.tsx
// - AnalysisSummary.tsx
// - QuickActions.tsx
```

#### Tarefa 6.2: Custom Hooks
```typescript
// Criar hooks reutilizáveis:
// - useLocalStorage.ts
// - useDebounce.ts
// - useApi.ts
// - useAuth.ts
```

#### Tarefa 6.3: State Management Review
```typescript
// Avaliar necessidade de Zustand/Redux
// Implementar optimistic updates
// Melhorar Context usage
```

---

### 📊 **Fase 7: Monitoramento & Observabilidade (1-2 dias)**

**Prioridade: BAIXA** - Preparar para produção

#### Tarefa 7.1: Error Tracking
```typescript
// Implementar Sentry
pnpm add @sentry/nextjs

// Configurar para capturar erros
// Adicionar performance monitoring
```

#### Tarefa 7.2: Analytics
```typescript
// Implementar Plausible/PostHog
// Rastrear eventos importantes:
// - Uploads completados
// - Análises geradas
// - Tempo de sessão
```

#### Tarefa 7.3: Performance Monitoring
```typescript
// Web Vitals tracking
// Bundle size monitoring
// API response times
```

---

### ✅ **Critérios de Sucesso**

#### Funcional
- [ ] Build passa sem erros (`pnpm build`)
- [ ] Linting passa sem warnings (`pnpm lint`)
- [ ] TypeScript passa (`pnpm typecheck`)
- [ ] Todos os testes passam (`pnpm test`)
- [ ] Bundle size reduzido em 20%+

#### Qualidade
- [ ] Cobertura de testes > 70%
- [ ] Zero console statements em produção
- [ ] Componentes lazy loaded funcionando
- [ ] Rate limiting implementado

#### Performance
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Bundle inicial < 200KB

---

### 🔄 **Execução e Controle**

#### Daily Standup Checklist
- [ ] Código commitado diariamente
- [ ] Testes passando
- [ ] Build funcionando
- [ ] Documentação atualizada

#### Code Review Requirements
- [ ] Pair programming para mudanças críticas
- [ ] Testes incluídos em PR
- [ ] Performance impact analisado
- [ ] Security review para mudanças de API

#### Rollback Plan
- [ ] Branches feature isoladas
- [ ] Deploy gradual (feature flags onde possível)
- [ ] Monitoring ativo durante deploy
- [ ] Rollback automático em falha crítica

---

### 📈 **Métricas de Acompanhamento**

| Métrica | Antes | Meta | Após |
|---------|-------|------|------|
| Bundle Size | ~400KB | <320KB | - |
| Test Coverage | ~30% | >70% | - |
| Lighthouse Score | - | >90 | - |
| Build Time | - | <30s | - |
| Linting Errors | 2 | 0 | - |

---

### 🎯 **Próximos Passos Imediatos**

1. **Hoje:** Atualizar no banco os `systemPrompt` e `outputSchema` dos três agentes `product_generator` (Alimentar, Suplementação, Treino), priorizando correção do `Gerador de Plano Alimentar`
2. **Amanhã:** Validar fluxo ponta a ponta do Plano Alimentar (upload → análise → produto) com payload real e sem `Incomplete meals weekly_plan`
3. **Esta semana:** Avançar Fase 5.2 com testes de integração cobrindo cenários de timeout e retry em upload/análise
4. **Próxima semana:** Iniciar Fase 6 (component splitting e hooks reutilizáveis)

**Comando para iniciar:**
```bash
# Verificar estado atual
pnpm lint && pnpm typecheck && pnpm test

# Começar correções
git checkout -b feat/improvements-phase1
```

Este plano é executável e priorizado por impacto. Podemos ajustar baseado no progresso e feedback durante a implementação.
