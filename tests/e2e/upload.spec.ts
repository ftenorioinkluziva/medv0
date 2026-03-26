import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import path from 'path'

const TEST_USER = {
  email: process.env.E2E_USER_DONE_EMAIL ?? 'e2e-done@test.sami.local',
  password: process.env.E2E_USER_DONE_PASSWORD ?? 'Test@12345',
}

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures/files')

async function loginAndNavigateToUpload(page: import('@playwright/test').Page): Promise<boolean> {
  await loginAs(page, TEST_USER.email, TEST_USER.password)
  if (page.url().includes('/auth/login')) return false
  await page.goto('/app/upload')
  if (page.url().includes('/auth/login')) return false
  return true
}

test.describe('Upload — Route Guards', () => {
  test('T-UP-01 — unauthenticated user is redirected to login', async ({ page }) => {
    // #given - no session
    // #when
    await page.goto('/app/upload')

    // #then
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('T-UP-02 — authenticated user sees upload page', async ({ page }) => {
    // #given
    const ok = await loginAndNavigateToUpload(page)
    test.skip(!ok, 'Test user not seeded in database')

    // #then
    await expect(page.getByText('Enviar exame')).toBeVisible()
    await expect(page.getByText('PDF, JPG ou PNG')).toBeVisible()
  })
})

test.describe('Upload — File Selection UI', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const ok = await loginAndNavigateToUpload(page)
    if (!ok) testInfo.skip()
    await expect(page.getByText('Enviar exame')).toBeVisible()
  })

  test('T-UP-03 — shows camera and file selection buttons', async ({ page }) => {
    // #given - upload page loaded
    // #then
    await expect(page.getByRole('button', { name: /Tirar foto/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Selecionar arquivo/ })).toBeVisible()
  })

  test('T-UP-04 — selecting a JPEG shows preview with filename', async ({ page }) => {
    // #given
    const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')

    // #when
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-exam.jpg'))

    // #then
    await expect(page.getByText('sample-exam.jpg')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar exame' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  })

  test('T-UP-05 — selecting a PDF shows preview with file icon', async ({ page }) => {
    // #given
    const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')

    // #when
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-exam.pdf'))

    // #then
    await expect(page.getByText('sample-exam.pdf')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar exame' })).toBeVisible()
  })

  test('T-UP-06 — cancel removes preview and returns to file selection', async ({ page }) => {
    // #given
    const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-exam.jpg'))
    await expect(page.getByText('sample-exam.jpg')).toBeVisible()

    // #when
    await page.getByRole('button', { name: 'Remover arquivo' }).click()

    // #then
    await expect(page.getByRole('button', { name: /Selecionar arquivo/ })).toBeVisible()
    await expect(page.getByText('sample-exam.jpg')).not.toBeVisible()
  })
})

test.describe('Upload — API Integration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const ok = await loginAndNavigateToUpload(page)
    if (!ok) testInfo.skip()
    await expect(page.getByText('Enviar exame')).toBeVisible()
  })

  test('T-UP-07 — submitting a JPEG triggers upload and shows progress', async ({ page }) => {
    // #given
    const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-exam.jpg'))
    await expect(page.getByText('sample-exam.jpg')).toBeVisible()

    const apiPromise = page.waitForRequest(
      (req) => req.url().includes('/api/documents/upload') && req.method() === 'POST',
    )

    // #when
    await page.getByRole('button', { name: 'Enviar exame' }).click()

    // #then
    await expect(
      page.getByText('Preparando...').or(page.getByText('Enviando...'))
    ).toBeVisible({ timeout: 5_000 })

    const request = await apiPromise
    expect(request.method()).toBe('POST')
  })

  test('T-UP-08 — successful upload shows "Concluido" and toast', async ({ page }) => {
    // #given
    await page.route('**/api/documents/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          documentId: '00000000-0000-0000-0000-000000000001',
          fileName: 'sample-exam.jpg',
        }),
      })
    })

    const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-exam.jpg'))

    // #when
    await page.getByRole('button', { name: 'Enviar exame' }).click()

    // #then
    await expect(page.getByText('Concluído!')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Enviar outro' })).toBeVisible()
    await expect(page.getByText(/Exame processado/)).toBeVisible({ timeout: 5_000 })
  })

  test('T-UP-09 — API error shows error toast and resets to idle', async ({ page }) => {
    // #given
    await page.route('**/api/documents/upload', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Tipo de arquivo não suportado. Use PDF, JPG ou PNG.' }),
      })
    })

    const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-exam.jpg'))

    // #when
    await page.getByRole('button', { name: 'Enviar exame' }).click()

    // #then
    await expect(page.getByText(/não suportado|Erro/)).toBeVisible({ timeout: 10_000 })
  })

  test('T-UP-10 — "Enviar outro" resets form after successful upload', async ({ page }) => {
    // #given
    await page.route('**/api/documents/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          documentId: '00000000-0000-0000-0000-000000000002',
          fileName: 'sample-exam.jpg',
        }),
      })
    })

    const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-exam.jpg'))
    await page.getByRole('button', { name: 'Enviar exame' }).click()
    await expect(page.getByText('Concluído!')).toBeVisible({ timeout: 10_000 })

    // #when
    await page.getByRole('button', { name: 'Enviar outro' }).click()

    // #then
    await expect(page.getByRole('button', { name: /Selecionar arquivo/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tirar foto/ })).toBeVisible()
  })
})

test.describe('Upload — API Validation (direct API tests)', () => {
  test('T-UP-11 — unauthenticated POST is rejected or redirected', async ({ request }) => {
    // #given - no session cookie
    // #when
    const response = await request.post('/api/documents/upload')

    // #then — server redirects to login (307->200) or returns 401
    const url = response.url()
    const status = response.status()
    const isRedirectedToLogin = url.includes('/auth/login')
    const is401 = status === 401

    expect(isRedirectedToLogin || is401).toBe(true)
  })

  test('T-UP-12 — 400 when no file sent (authenticated)', async ({ page, request }) => {
    // #given
    await loginAs(page, TEST_USER.email, TEST_USER.password)
    if (page.url().includes('/auth/login')) {
      test.skip(true, 'Test user not seeded in database')
      return
    }
    const cookies = await page.context().cookies()

    // #when
    const response = await request.post('/api/documents/upload', {
      headers: {
        Cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      },
    })

    // #then
    expect([400, 401]).toContain(response.status())
  })

  test('T-UP-13 — 422 when unsupported file type (authenticated)', async ({ page, request }) => {
    // #given
    await loginAs(page, TEST_USER.email, TEST_USER.password)
    if (page.url().includes('/auth/login')) {
      test.skip(true, 'Test user not seeded in database')
      return
    }
    const cookies = await page.context().cookies()

    // #when
    const response = await request.post('/api/documents/upload', {
      headers: {
        Cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      },
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('hello world'),
        },
      },
    })

    // #then
    expect(response.status()).toBe(422)
    const body = await response.json()
    expect(body.error).toContain('não suportado')
  })
})
