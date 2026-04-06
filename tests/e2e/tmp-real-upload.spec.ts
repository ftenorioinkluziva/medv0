import { test, expect } from '@playwright/test'
import path from 'path'

const STORAGE_DONE = path.resolve(__dirname, 'fixtures/storage/auth-done.json')

test.use({ storageState: STORAGE_DONE })

test('real upload target pdf', async ({ page }) => {
  test.setTimeout(300000)

  await page.goto('/app/upload')
  await expect(page.getByRole('button', { name: /Selecionar arquivo/ })).toBeVisible({ timeout: 30000 })

  const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')
  await fileInput.setInputFiles('C:/Users/fteno/Downloads/LaudoSabin-FernandoTenorio-13-03-2026.pdf')

  await expect(page.getByText('LaudoSabin-FernandoTenorio-13-03-2026.pdf')).toBeVisible()
  await page.getByRole('button', { name: 'Enviar exame' }).click()

  await expect(page.getByText('Concluído!')).toBeVisible({ timeout: 240000 })
})
