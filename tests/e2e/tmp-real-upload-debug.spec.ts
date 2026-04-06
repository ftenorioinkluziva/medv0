import { test, expect } from '@playwright/test'
import path from 'path'

const STORAGE_DONE = path.resolve(__dirname, 'fixtures/storage/auth-done.json')

test.use({ storageState: STORAGE_DONE })

test('debug real upload response', async ({ page }) => {
  test.setTimeout(300000)

  await page.goto('/app/upload')
  await expect(page.getByRole('button', { name: /Selecionar arquivo/ })).toBeVisible({ timeout: 60000 })

  const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')
  await fileInput.setInputFiles('C:/Users/fteno/Downloads/LaudoSabin-FernandoTenorio-13-03-2026.pdf')

  const responsePromise = page.waitForResponse((res) => res.url().includes('/api/documents/upload') && res.request().method() === 'POST', { timeout: 240000 })

  await page.getByRole('button', { name: 'Enviar exame' }).click()
  const response = await responsePromise
  const body = await response.text()

  console.log('UPLOAD_STATUS=' + response.status())
  console.log('UPLOAD_BODY=' + body)
})
