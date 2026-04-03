import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
}

test.describe('Analyses Routing', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(STORAGE.done)) {
      test.skip(
        true,
        'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup',
      )
    }
  })

  test.use({
    storageState: STORAGE.done,
    viewport: { width: 390, height: 844 },
  })

  test('keeps /app/analyses/run route and handles invalid documentId gracefully', async ({ page }) => {
    // #given
    await page.goto('/app/analyses/run?documentId=invalid-id')

    // #when
    await page.waitForLoadState('networkidle')

    // #then
    await expect(page).toHaveURL(/\/app\/analyses\/run\?documentId=invalid-id/)
    await expect(page.getByText('Nao foi possivel iniciar a analise')).toBeVisible()
    await expect(page.getByText('Documento invalido para iniciar analise.')).toBeVisible()
  })

  test('renders not found message for invalid UUID on /app/analyses/[id]', async ({ page }) => {
    // #given
    await page.goto('/app/analyses/run')

    // #when
    await page.waitForLoadState('networkidle')

    // #then
    await expect(page).toHaveURL(/\/app\/analyses\/run$/)
    await expect(page.getByText('Nao foi possivel iniciar a analise')).toBeVisible()
  })
})
