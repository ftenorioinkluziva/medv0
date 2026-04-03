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

test.describe('Admin Knowledge Base', () => {
  test.beforeEach(async ({ page }) => {
    // #given
    await loginAsAdmin(page)

    // #when
    await page.goto('/admin/knowledge')

    // #then
    await expect(page.locator('h1')).toContainText('Knowledge Base')
  })

  test('filtra por categoria e mantém resultados coerentes', async ({ page }) => {
    // #given
    const categoryFilter = page.getByRole('combobox').nth(0)
    await categoryFilter.click()

    const options = page.getByRole('option')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThan(1)
    const selectedCategory = (await options.nth(1).innerText()).trim()

    // #when
    await options.nth(1).click()

    // #then
    await expect(categoryFilter).toContainText(selectedCategory)
    const categoryCells = page.locator('tbody tr td:nth-child(2)')
    const count = await categoryCells.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i += 1) {
      await expect(categoryCells.nth(i)).toContainText(selectedCategory)
    }
  })

  test('pagina entre resultados da lista', async ({ page }) => {
    // #given
    await expect(page.getByText('Página 1 de')).toBeVisible()
    const nextButton = page.getByRole('button', { name: 'Próxima' })

    // #when
    await nextButton.click()

    // #then
    await expect(page.getByText('Página 2 de')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Anterior' })).toBeEnabled()
  })
})