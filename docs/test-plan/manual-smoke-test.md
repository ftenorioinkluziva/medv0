# SAMI — Plano de Teste Manual (Smoke Test)

**Data:** 2026-04-02  
**Ambiente:** `http://localhost:3000`  
**Viewport:** Mobile (390px) — use DevTools ou um celular real  
**Resultado:** ✅ OK | ❌ Bug | ⚠️ Comportamento inesperado mas não bloqueante

Ao encontrar um ❌ ou ⚠️, registre na coluna **Issue** com uma descrição breve.  
Claude Code abrirá o issue no Linear na sequência.

---

## Contas de Teste

Crie as contas abaixo antes de iniciar (se ainda não existirem):

| Papel | E-mail | Senha |
|-------|--------|-------|
| Paciente | `paciente@teste.com` | `Teste@123` |
| Admin | `admin@teste.com` | `Admin@123` |

> Para criar o admin: registre normalmente e depois altere `role` para `admin` via `pnpm db:studio`.

---

## Fluxo 1 — Autenticação

| # | Rota | Ação | Resultado Esperado | Resultado | Issue |
|---|------|------|--------------------|-----------|-------|
| 1.1 | `/auth/register` | Abrir a página | Formulário de cadastro visível, layout mobile correto | | |
| 1.2 | `/auth/register` | Submeter com campos vazios | Erros de validação inline nos campos | | |
| 1.3 | `/auth/register` | Cadastrar `paciente@teste.com` | Redirecionamento para onboarding ou dashboard | | |
| 1.4 | `/auth/login` | Abrir a página | Formulário de login visível | | |
| 1.5 | `/auth/login` | Submeter credenciais erradas | Mensagem de erro clara | | |
| 1.6 | `/auth/login` | Login com `paciente@teste.com` | Redirecionamento para `/app/dashboard` | | |
| 1.7 | `/auth/forgot-password` | Abrir a página | Formulário de recuperação visível | | |
| 1.8 | `/auth/forgot-password` | Submeter e-mail válido | Mensagem de confirmação de envio | | |
| 1.9 | Qualquer página `/app/*` | Acesso sem estar logado | Redirecionamento para `/auth/login` | | |

---

## Fluxo 2 — Onboarding

| # | Rota | Ação | Resultado Esperado | Resultado | Issue |
|---|------|------|--------------------|-----------|-------|
| 2.1 | `/app/onboarding` | Primeiro acesso após cadastro | Tela de onboarding exibida (disclaimer + aceite) | | |
| 2.2 | `/app/onboarding` | Aceitar disclaimer | Avançar para próxima etapa (dados básicos do perfil) | | |
| 2.3 | `/app/onboarding` | Preencher dados básicos (nome, idade, sexo) | Campos aceitam input, layout mobile OK | | |
| 2.4 | `/app/onboarding` | Concluir onboarding | Redirecionamento para `/app/dashboard` | | |

---

## Fluxo 3 — Dashboard

| # | Rota | Ação | Resultado Esperado | Resultado | Issue |
|---|------|------|--------------------|-----------|-------|
| 3.1 | `/app/dashboard` | Abrir com conta nova (sem exames) | Estado vazio com CTA "Novo exame" visível | | |
| 3.2 | `/app/dashboard` | Verificar navegação inferior (mobile) | Nav bar com ícones: Dashboard, Upload, Histórico, Perfil | | |
| 3.3 | `/app/dashboard` | Clicar no CTA "Novo exame" | Navegar para `/app/upload` | | |

---

## Fluxo 4 — Upload e Processamento de Documento

| # | Rota | Ação | Resultado Esperado | Resultado | Issue |
|---|------|------|--------------------|-----------|-------|
| 4.1 | `/app/upload` | Abrir a página | Área de upload visível, botão câmera/galeria | | |
| 4.2 | `/app/upload` | Tentar enviar sem selecionar arquivo | Validação exibida | | |
| 4.3 | `/app/upload` | Selecionar um PDF de exame de sangue | Preview ou nome do arquivo exibido | | |
| 4.4 | `/app/upload` | Confirmar upload | Indicador de processamento (spinner/progress) | | |
| 4.5 | `/app/upload` | Aguardar processamento (≤ 30s) | Redirecionamento ou mensagem de sucesso | | |
| 4.6 | `/app/upload` | Tentar enviar arquivo inválido (ex: `.txt`) | Mensagem de erro de tipo de arquivo | | |

---

## Fluxo 5 — Análise de Saúde

| # | Rota | Ação | Resultado Esperado | Resultado | Issue |
|---|------|------|--------------------|-----------|-------|
| 5.1 | Após upload | Solicitar análise | Botão "Gerar análise" ou início automático | | |
| 5.2 | Durante análise | Aguardar (≤ 60s) | Indicador de progresso visível | | |
| 5.3 | `/app/analyses/[id]` | Abrir relatório gerado | Relatório em Markdown com seções: Resumo, Análise, Recomendações | | |
| 5.4 | `/app/analyses/[id]` | Verificar disclaimer | Texto "Esta análise é gerada por IA…" visível no relatório | | |
| 5.5 | `/app/analyses/[id]` | Scroll no mobile | Relatório rola suavemente, sem overflow horizontal | | |

---

## Fluxo 6 — Histórico

| # | Rota | Ação | Resultado Esperado | Resultado | Issue |
|---|------|------|--------------------|-----------|-------|
| 6.1 | `/app/history` | Abrir após 1 exame | Lista com o exame enviado, data e tipo visíveis | | |
| 6.2 | `/app/history` | Verificar card do exame | Botão "Ver relatório" leva para `/app/analyses/[id]` | | |
| 6.3 | `/app/history` | Após 2 exames do mesmo tipo | Indicador de evolução exibido (↑ ↓ —) | | |
| 6.4 | `/app/history` | Conta sem exames | Estado vazio com CTA para upload | | |

---

## Fluxo 7 — Perfil Médico

| # | Rota | Ação | Resultado Esperado | Resultado | Issue |
|---|------|------|--------------------|-----------|-------|
| 7.1 | `/app/profile` | Abrir a página | Dados do perfil exibidos (nome, idade, etc.) | | |
| 7.2 | `/app/profile` | Editar campo (ex: peso) | Campo editável, salvar sem erros | | |
| 7.3 | `/app/profile` | Salvar perfil | Mensagem de sucesso / persistência confirmada ao recarregar | | |
| 7.4 | `/app/profile` | Verificar campos avançados | Campos de condições, medicamentos, alergias visíveis | | |

---

## Fluxo 8 — Admin Panel

> Requer login com conta `admin`.

| # | Rota | Ação | Resultado Esperado | Resultado | Issue |
|---|------|------|--------------------|-----------|-------|
| 8.1 | `/admin` | Acesso com conta admin | Dashboard admin visível | | |
| 8.2 | `/admin` | Acesso com conta paciente | Redirecionamento ou erro 403 | | |
| 8.3 | `/admin/agents` | Abrir lista de agentes | Agentes de IA listados com nome, role e status | | |
| 8.4 | `/admin/agents` | Editar um agente | Formulário de edição funcional, salvar OK | | |
| 8.5 | `/admin/users` | Abrir lista de usuários | Usuários cadastrados listados | | |
| 8.6 | `/admin/users` | Buscar usuário por e-mail | Filtro funcional | | |
| 8.7 | `/admin/knowledge` | Abrir base de conhecimento | Lista de artigos (pode estar vazia) | | |

---

## Fluxo 9 — PWA / Mobile

| # | Ação | Resultado Esperado | Resultado | Issue |
|---|------|--------------------|-----------|-------|
| 9.1 | Abrir no Chrome mobile (ou DevTools mobile) | Layout responsivo, sem overflow | | |
| 9.2 | Verificar `manifest.json` | Chrome mostra opção "Adicionar à tela inicial" | | |
| 9.3 | Instalar como PWA | App abre em modo standalone (sem barra do browser) | | |
| 9.4 | Navegar com PWA instalado | Navegação fluida, sem recarregamento desnecessário | | |

---

## Resumo de Issues Encontrados

| # | Fluxo | Descrição | Severidade | Linear Issue |
|---|-------|-----------|-----------|--------------|
| | | | | |

> **Severidades:** 🔴 Bloqueante | 🟡 Importante | 🟢 Cosmético

---

## Como Registrar um Bug

Ao encontrar um problema, informe:
```
Fluxo X.Y — [descrição breve do problema]
Severidade: 🔴 / 🟡 / 🟢
Passos para reproduzir: ...
Comportamento atual: ...
Comportamento esperado: ...
```

Claude Code abrirá o issue no Linear automaticamente.
