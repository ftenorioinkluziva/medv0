import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
}

// ---------------------------------------------------------------------------
// Suite 1: Login Page (no auth needed)
// ---------------------------------------------------------------------------

test.describe('Auth — Login Page', () => {
  test('T-AUTH-01 — login page renders with form fields', async ({ page }) => {
    // #given - clean session
    // #when
    await page.goto('/auth/login')

    // #then — CardTitle renders as div, not heading
    await expect(page.locator('text=SAMI').first()).toBeVisible()
    await expect(page.getByText('Entre na sua conta')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Criar conta/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Esqueci minha senha/ })).toBeVisible()
  })

  test('T-AUTH-02 — invalid credentials show error message', async ({ page }) => {
    // #given
    await page.goto('/auth/login')

    // #when
    await page.fill('input[name="email"]', 'nonexistent@test.invalid')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // #then
    await expect(page.getByText(/inválidos/)).toBeVisible({ timeout: 10_000 })
  })

  test('T-AUTH-04 — "Criar conta" link navigates to register page', async ({ page }) => {
    // #given
    await page.goto('/auth/login')

    // #when
    await page.getByRole('link', { name: /Criar conta/ }).click()

    // #then
    await expect(page).toHaveURL(/\/auth\/register/)
  })

  test('T-AUTH-05 — "Esqueci minha senha" link navigates to forgot-password', async ({ page }) => {
    // #given
    await page.goto('/auth/login')

    // #when
    await page.getByRole('link', { name: /Esqueci minha senha/ }).click()

    // #then
    await expect(page).toHaveURL(/\/auth\/forgot-password/)
  })
})

// ---------------------------------------------------------------------------
// Suite 2: Protected Routes (no auth — should redirect)
// ---------------------------------------------------------------------------

test.describe('Auth — Protected Routes', () => {
  test('T-AUTH-06 — /app/dashboard redirects unauthenticated to login', async ({ page }) => {
    // #given - no session
    // #when
    await page.goto('/app/dashboard')

    // #then
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('T-AUTH-07 — /app/upload redirects unauthenticated to login', async ({ page }) => {
    // #given - no session
    // #when
    await page.goto('/app/upload')

    // #then
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('T-AUTH-08 — /app/profile redirects unauthenticated to login', async ({ page }) => {
    // #given - no session
    // #when
    await page.goto('/app/profile')

    // #then
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

// ---------------------------------------------------------------------------
// Suite 3: Authenticated routes (done user via storageState)
// ---------------------------------------------------------------------------

test.describe('Auth — Session Persistence', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(STORAGE.done)) {
      test.skip(true, 'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup')
    }
  })
  test.use({ storageState: STORAGE.done })

  test('T-AUTH-03 — authenticated user can access dashboard', async ({ page }) => {
    // #given - authenticated via storageState
    // #when
    await page.goto('/app/dashboard')

    // #then - not redirected to login
    await expect(page).toHaveURL(/\/app\/dashboard/)
  })

  test('T-AUTH-09 — session persists across page navigations', async ({ page }) => {
    // #given - authenticated via storageState
    await page.goto('/app/dashboard')
    await expect(page).toHaveURL(/\/app\/dashboard/)

    // #when - navigate to another protected page
    await page.goto('/app/upload')

    // #then - still authenticated (not redirected to login)
    await expect(page).toHaveURL(/\/app\/upload/)
    await expect(page.getByText('Enviar exame')).toBeVisible()
  })
})
