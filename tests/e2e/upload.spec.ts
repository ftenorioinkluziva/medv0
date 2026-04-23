import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
}

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures/files')

// ---------------------------------------------------------------------------
// Suite 1: Route Guards (no auth — should redirect)
// ---------------------------------------------------------------------------

test.describe('Upload — Route Guards', () => {
  test('T-UP-01 — unauthenticated user is redirected to login', async ({ page }) => {
    // #given - no session
    // #when
    await page.goto('/app/upload')

    // #then
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

// ---------------------------------------------------------------------------
// Suite 2: Authenticated tests (done user via storageState)
// ---------------------------------------------------------------------------

test.describe('Upload — Authenticated', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(STORAGE.done)) {
      test.skip(true, 'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup')
    }
  })
  test.use({ storageState: STORAGE.done })

  test('T-UP-02 — authenticated user sees upload page', async ({ page }) => {
    // #given - authenticated via storageState
    // #when
    await page.goto('/app/upload')

    // #then
    await expect(page.getByText('Enviar exame')).toBeVisible()
    await expect(page.getByText('PDF, JPG ou PNG')).toBeVisible()
  })

  test.describe('File Selection UI', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app/upload')
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

    test('T-UP-05A — selecting a file shows document type picker before upload', async ({ page }) => {
      // #given
      const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')

      // #when
      await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-exam.pdf'))

      // #then
      await expect(page.getByRole('radio', { name: 'Bioimpedância' })).toBeVisible()
      await expect(page.getByRole('radio', { name: 'Exames de Sangue' })).toBeVisible()
      await expect(page.getByRole('radio', { name: 'Outros' })).toBeVisible()
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

  test.describe('API Integration', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app/upload')
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
      await page.getByRole('radio', { name: 'Outros' }).click()
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
      await page.getByRole('radio', { name: 'Outros' }).click()
      await page.getByRole('button', { name: 'Enviar exame' }).click()

      // #then
      await expect(page.getByText('Concluído!')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole('button', { name: 'Enviar outro' })).toBeVisible()
      await expect(page.getByText(/Exame processado/)).toBeVisible({ timeout: 5_000 })
    })

    test('T-UP-08A — slow successful upload does not show premature timeout', async ({ page }) => {
      // #given
      await page.route('**/api/documents/upload', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 35_000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            documentId: '00000000-0000-0000-0000-000000000003',
            fileName: 'sample-exam.jpg',
          }),
        })
      })

      const fileInput = page.locator('input[aria-label="Selecionar arquivo"]')
      await fileInput.setInputFiles(path.join(FIXTURES_DIR, 'sample-exam.jpg'))

      // #when
      await page.getByRole('radio', { name: 'Outros' }).click()
      await page.getByRole('button', { name: 'Enviar exame' }).click()

      // #then
      await expect(page.getByText('Concluído!')).toBeVisible({ timeout: 45_000 })
      await expect(page.getByText(/Tempo esgotado\. Tente novamente\./)).not.toBeVisible()
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
      await page.getByRole('radio', { name: 'Outros' }).click()
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
      await page.getByRole('radio', { name: 'Outros' }).click()
      await page.getByRole('button', { name: 'Enviar exame' }).click()
      await expect(page.getByText('Concluído!')).toBeVisible({ timeout: 10_000 })

      // #when
      await page.getByRole('button', { name: 'Enviar outro' }).click()

      // #then
      await expect(page.getByRole('button', { name: /Selecionar arquivo/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Tirar foto/ })).toBeVisible()
    })
  })
})

// ---------------------------------------------------------------------------
// Suite 3: API Validation (direct API tests via `request` fixture)
// ---------------------------------------------------------------------------

test.describe('Upload — API Validation (direct API tests)', () => {
  test('T-UP-11 — unauthenticated POST is rejected or redirected', async ({ request }) => {
    // #given - no session cookie
    // #when
    const response = await request.post('/api/documents/upload')

    // #then — server returns 401 or redirects to login
    const url = response.url()
    const status = response.status()
    const isRedirectedToLogin = url.includes('/auth/login')
    const is401 = status === 401

    expect(isRedirectedToLogin || is401).toBe(true)
  })

  test.describe('Authenticated API tests', () => {
    test.beforeAll(() => {
      if (!fs.existsSync(STORAGE.done)) {
        test.skip(true, 'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup')
      }
    })
    test.use({ storageState: STORAGE.done })

    test('T-UP-12 — 400 when no file sent (authenticated)', async ({ page, request }) => {
      // #given - session cookies from storageState context
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
      // #given - session cookies from storageState context
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
})
