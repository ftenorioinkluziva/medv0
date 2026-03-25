# Testes E2E — SAMI

## Dois modos de uso

| Aspecto | MCP (desenvolvimento) | Standalone (CI) |
|---------|----------------------|-----------------|
| Comando | `mcp__plugin_playwright_playwright__browser_navigate` | `pnpm test:e2e` |
| Contexto | Claude Code durante dev | GitHub Actions |
| Config | Não usa `playwright.config.ts` | Usa `playwright.config.ts` |
| Viewport | Configurado por parâmetro | `devices['iPhone 14 Pro']` (390×844) |
| Uso típico | Verificar feature durante dev | Smoke tests em CI |

## Uso via MCP (Claude Code)

O MCP do Playwright já está configurado no Claude Code. Durante o desenvolvimento, use os comandos diretamente:

```
mcp__plugin_playwright_playwright__browser_navigate  → abrir URL
mcp__plugin_playwright_playwright__browser_snapshot  → capturar estado
mcp__plugin_playwright_playwright__browser_screenshot → tirar screenshot
mcp__plugin_playwright_playwright__browser_click     → clicar em elemento
mcp__plugin_playwright_playwright__browser_fill_form → preencher formulário
```

Para testar com viewport mobile (390px):
```
mcp__plugin_playwright_playwright__browser_resize → width: 390, height: 844
```

## Uso Standalone (local)

Requer dev server rodando:

```bash
# Terminal 1 — inicia o servidor
pnpm dev

# Terminal 2 — roda os testes
pnpm test:e2e

# Ver relatório HTML
pnpm exec playwright show-report
```

## Uso em CI (GitHub Actions)

O `webServer` block no `playwright.config.ts` inicia o servidor automaticamente:

```bash
pnpm test:e2e:ci
```

Step no GitHub Actions:
```yaml
- run: pnpm exec playwright install --with-deps chromium
- run: pnpm test:e2e:ci
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Estrutura

```
tests/e2e/
├── fixtures/
│   └── auth.ts       # Helper de login reutilizável
├── smoke.spec.ts     # Smoke test — homepage carrega
└── README.md         # Este arquivo
```

## Convenções

- Um arquivo `.spec.ts` por fluxo (ex: `auth.spec.ts`, `upload.spec.ts`)
- Fixtures reutilizáveis em `fixtures/`
- Viewport mobile (`devices['iPhone 14 Pro']`) aplicado globalmente via config
- Screenshots e traces salvos automaticamente em falhas (`test-results/`)
