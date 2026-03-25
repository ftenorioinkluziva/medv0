import { test, expect } from '@playwright/test'

test('homepage carrega sem erros', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.+/)
  await expect(page.locator('body')).toBeVisible()
})
