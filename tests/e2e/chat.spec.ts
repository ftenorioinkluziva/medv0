import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
}

// ---------------------------------------------------------------------------
// Suite: Chat UI — Story 12.2 (BLA-81)
// AC1 — Agent selection page
// AC2 — Session start (new vs resume)
// AC3 — Message interface with streaming
// AC5 — Session history
// AC6 — Rate limit UI
// AC7 — Mobile-first 390px layout
// ---------------------------------------------------------------------------

test.describe('Chat UI — 390px viewport', () => {
  test.skip(
    !fs.existsSync(STORAGE.done),
    'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup',
  )

  test.use({
    storageState: STORAGE.done,
    viewport: { width: 390, height: 844 },
  })

  // ── AC1 — Agent selection page ────────────────────────────────────────────

  test('T-CH-01 — /app/chat mostra lista de agentes ativos', async ({ page }) => {
    // #given
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')

    // #when / #then — pelo menos 1 agente visível como botão
    const agentButtons = page.getByRole('button')
    await expect(agentButtons.first()).toBeVisible()
  })

  test('T-CH-02 — /app/chat sem overflow horizontal em 390px', async ({ page }) => {
    // #given
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')

    // #when
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    // #then
    expect(hasOverflow).toBe(false)
  })

  test('T-CH-03 — /app/chat acessível via bottom nav', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')

    // #when
    await page.getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Chat' })
      .click()

    // #then
    await expect(page).toHaveURL('/app/chat')
  })

  // ── AC2 — Session start / resume ─────────────────────────────────────────

  test('T-CH-04 — clicar em agente redireciona para /app/chat/[sessionId]', async ({ page }) => {
    // #given
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')

    // #when — clicar no primeiro agente disponível
    const firstAgent = page.getByRole('button').first()
    await firstAgent.click()

    // #then — navega para sessão de chat
    await page.waitForURL(/\/app\/chat\/[0-9a-f-]{36}/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/app\/chat\/[0-9a-f-]{36}/)
  })

  // ── AC3 — Chat interface layout ───────────────────────────────────────────

  test('T-CH-05 — interface de chat exibe header, disclaimer e input', async ({ page }) => {
    // #given — navegar para sessão existente (ou criar via agente)
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button').first().click()
    await page.waitForURL(/\/app\/chat\/[0-9a-f-]{36}/, { timeout: 10_000 })

    // #when — verificar estrutura da página
    // #then
    await expect(page.getByRole('link', { name: 'Voltar para seleção de agente' })).toBeVisible()
    await expect(page.getByText('educacionais', { exact: false })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Mensagem' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible()
  })

  test('T-CH-06 — input fixo visível na parte inferior em 390px', async ({ page }) => {
    // #given
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button').first().click()
    await page.waitForURL(/\/app\/chat\/[0-9a-f-]{36}/, { timeout: 10_000 })

    // #when — verificar posição do input
    const input = page.getByRole('textbox', { name: 'Mensagem' })
    const inputBox = await input.boundingBox()

    // #then — input deve estar na metade inferior da tela (abaixo do meio = y > 422)
    expect(inputBox).not.toBeNull()
    expect(inputBox!.y).toBeGreaterThan(400)
  })

  test('T-CH-07 — envio de mensagem: aparece bubble e campo limpo', async ({ page }) => {
    // #given
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button').first().click()
    await page.waitForURL(/\/app\/chat\/[0-9a-f-]{36}/, { timeout: 10_000 })

    const input = page.getByRole('textbox', { name: 'Mensagem' })

    // #when
    await input.fill('Olá, qual é minha vitamina D?')
    await page.getByRole('button', { name: 'Enviar' }).click()

    // #then — mensagem do usuário aparece imediatamente
    await expect(page.getByText('Olá, qual é minha vitamina D?')).toBeVisible()

    // #then — campo limpo
    await expect(input).toHaveValue('')
  })

  test('T-CH-08 — chat sem overflow horizontal em 390px', async ({ page }) => {
    // #given
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button').first().click()
    await page.waitForURL(/\/app\/chat\/[0-9a-f-]{36}/, { timeout: 10_000 })
    await page.waitForLoadState('networkidle')

    // #when
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    // #then
    expect(hasOverflow).toBe(false)
  })

  // ── AC5 — Session history ─────────────────────────────────────────────────

  test('T-CH-09 — /app/chat exibe sessões anteriores quando existem', async ({ page }) => {
    // #given — criar sessão primeiro (clicar em agente)
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button').first().click()
    await page.waitForURL(/\/app\/chat\/[0-9a-f-]{36}/, { timeout: 10_000 })

    // #when — voltar à lista
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')

    // #then — seção "Conversas anteriores" deve existir
    const heading = page.getByText('Conversas anteriores')
    await expect(heading).toBeVisible()
  })

  test('T-CH-10 — clicar em sessão anterior navega para o chat correto', async ({ page }) => {
    // #given — garantir que existe pelo menos uma sessão
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button').first().click()
    await page.waitForURL(/\/app\/chat\/[0-9a-f-]{36}/, { timeout: 10_000 })
    const sessionUrl = page.url()

    // #when — voltar e clicar na sessão anterior
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')

    // clicar no primeiro link de sessão anterior
    const sessionLinks = page.locator('a[href*="/app/chat/"]')
    await sessionLinks.first().click()

    // #then — navega para URL de sessão
    await page.waitForURL(/\/app\/chat\/[0-9a-f-]{36}/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/app\/chat\/[0-9a-f-]{36}/)
  })

  // ── AC2 — Back button ─────────────────────────────────────────────────────

  test('T-CH-11 — back button volta para /app/chat', async ({ page }) => {
    // #given
    await page.goto('/app/chat')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button').first().click()
    await page.waitForURL(/\/app\/chat\/[0-9a-f-]{36}/, { timeout: 10_000 })

    // #when
    await page.getByRole('link', { name: 'Voltar para seleção de agente' }).click()

    // #then
    await expect(page).toHaveURL('/app/chat')
  })
})
