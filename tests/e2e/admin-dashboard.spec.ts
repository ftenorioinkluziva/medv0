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

test.describe('Admin Dashboard', () => {
  test('exibe logout e redireciona para login ao sair', async ({ page }) => {
    // #given
    await loginAsAdmin(page)
    await page.goto('/admin')

    // #when
    await page.getByRole('button', { name: 'Sair' }).first().click()

    // #then
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})