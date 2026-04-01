import { test, expect } from '@playwright/test'

test.describe('Admin Agents CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly — assumes dev session already authenticated
    await page.goto('/admin/agents')
    await expect(page.locator('h1')).toContainText('Agentes')
  })

  test('criar agente via formulário aparece na listagem', async ({ page }) => {
    // #given — agents list page
    await page.click('text=Novo Agente')
    await expect(page).toHaveURL('/admin/agents/new')

    // #when — fill and submit form
    await page.fill('input[name="name"]', 'Agente E2E Teste')
    await page.fill('input[name="specialty"]', 'Especialidade E2E')
    await page.fill(
      'textarea[name="systemPrompt"]',
      'Este é o system prompt de teste criado pelo E2E com mais de 50 caracteres.',
    )
    await page.fill('input[name="model"]', 'google/gemini-2.5-flash')
    await page.click('button[type="submit"]')

    // #then — redirected back to list, new agent visible
    await expect(page).toHaveURL('/admin/agents')
    await expect(page.locator('table')).toContainText('Agente E2E Teste')
  })

  test('toggle ativo/inativo atualiza switch na listagem', async ({ page }) => {
    // #given — at least one specialized agent exists
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    // Find a specialized agent row that is currently INACTIVE (safe to toggle without AlertDialog)
    const specializedRow = page
      .locator('tbody tr')
      .filter({ hasText: 'Specialized' })
      .filter({ has: page.locator('button[role="switch"][aria-checked="false"]') })
      .first()

    const switchEl = specializedRow.locator('button[role="switch"]')

    // #when — click the switch (inactive → active, no confirmation dialog)
    await switchEl.click()

    // #then — switch is now active
    await expect(switchEl).toHaveAttribute('aria-checked', 'true')
  })
})
