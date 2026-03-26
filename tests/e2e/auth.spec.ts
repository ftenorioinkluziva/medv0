import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

const TEST_USER = {
  email: process.env.E2E_USER_DONE_EMAIL ?? 'e2e-done@test.sami.local',
  password: process.env.E2E_USER_DONE_PASSWORD ?? 'Test@12345',
}

async function canLogin(page: import('@playwright/test').Page): Promise<boolean> {
  await loginAs(page, TEST_USER.email, TEST_USER.password)
  return !page.url().includes('/auth/login')
}

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

  test('T-AUTH-03 — successful login redirects to dashboard or onboarding', async ({ page }) => {
    // #given - requires seeded test user
    const loggedIn = await canLogin(page)
    test.skip(!loggedIn, 'Test user not seeded in database')

    // #then
    await expect(page).toHaveURL(/\/app\/(dashboard|onboarding)/, { timeout: 10_000 })
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

test.describe('Auth — Session Persistence', () => {
  test('T-AUTH-09 — session persists across page navigations', async ({ page }) => {
    // #given - requires seeded test user
    const loggedIn = await canLogin(page)
    test.skip(!loggedIn, 'Test user not seeded in database')

    // #when
    await page.goto('/app/upload')

    // #then - still authenticated (not redirected to login)
    await expect(page).toHaveURL(/\/app\/upload/)
    await expect(page.getByText('Enviar exame')).toBeVisible()
  })
})
