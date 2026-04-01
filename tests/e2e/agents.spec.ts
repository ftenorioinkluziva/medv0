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

    // Find a specialized agent row (safe to toggle without foundation guard)
    const specializedRow = page.locator('tbody tr').filter({ hasText: 'specialized' }).first()
    const switchEl = specializedRow.locator('button[role="switch"]')

    const initialChecked = (await switchEl.getAttribute('aria-checked')) === 'true'

    // #when — click the switch
    await switchEl.click()

    // #then — switch state inverted
    const expectedChecked = !initialChecked
    await expect(switchEl).toHaveAttribute(
      'aria-checked',
      expectedChecked ? 'true' : 'false',
    )
  })
})
