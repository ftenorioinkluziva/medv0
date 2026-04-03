import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@teste.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123'

async function loginAsAdmin(page: Parameters<typeof test.beforeEach>[0]['page']) {
  await page.goto('/auth/login')
  await page.fill('input[name="email"]', ADMIN_EMAIL)
  await page.fill('input[name="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 })
}

test.describe('Admin Agents CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as admin for deterministic access to /admin/*
    await loginAsAdmin(page)
    await page.goto('/admin/agents')
    await expect(page.locator('h1')).toContainText('Agentes')
  })

  test('criar agente via formulário aparece na listagem', async ({ page }) => {
    const uniqueName = `Agente E2E Teste ${Date.now()}`

    // #given — agents list page
    await page.click('text=Novo Agente')
    await expect(page).toHaveURL('/admin/agents/new')

    // #when — fill and submit form
    await page.fill('input[name="name"]', uniqueName)
    await page.fill('input[name="specialty"]', 'Especialidade E2E')
    await page.fill(
      'textarea[name="systemPrompt"]',
      'Este é o system prompt de teste criado pelo E2E com mais de 50 caracteres.',
    )
    await page.fill('input[name="model"]', 'google/gemini-2.5-flash')
    await page.click('button[type="submit"]')

    // #then — redirected back to list, new agent visible
    await expect(page).toHaveURL('/admin/agents')
    await expect(page.locator('table')).toContainText(uniqueName)
  })

  test('toggle ativo/inativo atualiza switch na listagem', async ({ page }) => {
    // #given — at least one switchable agent row exists
    const switchEl = page.getByRole('switch').first()
    await expect(switchEl).toBeVisible()
    const currentState = await switchEl.getAttribute('aria-checked')
    const expectedState = currentState === 'true' ? 'false' : 'true'

    // #when — click the switch to toggle state
    await switchEl.click()

    if (currentState === 'true') {
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: 'Desativar' }).click()
    }

    // #then — switch reflects the toggled state
    await expect(switchEl).toHaveAttribute('aria-checked', expectedState)
  })

  test('excluir agente não gera erro de semântica de botão no console', async ({ page }) => {
    // #given
    const runtimeErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        runtimeErrors.push(msg.text())
      }
    })
    page.on('pageerror', (err) => runtimeErrors.push(err.message))

    const unique = `Agente Delete E2E ${Date.now()}`

    // create a disposable agent
    await page.click('text=Novo Agente')
    await expect(page).toHaveURL('/admin/agents/new')
    await page.fill('input[name="name"]', unique)
    await page.fill('input[name="specialty"]', 'Especialidade E2E Delete')
    await page.fill(
      'textarea[name="systemPrompt"]',
      'Prompt de exclusão E2E com mais de cinquenta caracteres para validação de fluxo.',
    )
    await page.fill('input[name="model"]', 'google/gemini-2.5-flash')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/admin/agents')

    // #when
    const row = page.locator('tbody tr').filter({ hasText: unique }).first()
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Excluir' }).click()

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Excluir' }).click()

    // #then
    await expect(page.locator('tbody tr').filter({ hasText: unique })).toHaveCount(0)
    expect(runtimeErrors.join('\n')).not.toContain('Base UI: A component that acts as a button expected a native <button>')
  })
})
