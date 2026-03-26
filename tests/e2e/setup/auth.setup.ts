/**
 * Global auth setup — runs once before all E2E tests.
 * Logs in each test user via UI and saves the browser storage state.
 * Tests that require auth load the saved state instead of re-logging in.
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const BASE = path.resolve(__dirname, '../fixtures/storage')

export const STORAGE = {
  done: path.join(BASE, 'auth-done.json'),
  new: path.join(BASE, 'auth-new.json'),
}

const USERS = [
  {
    email: process.env.E2E_USER_DONE_EMAIL ?? 'e2e-done@test.sami.local',
    password: process.env.E2E_USER_PASSWORD ?? 'Test@12345',
    file: STORAGE.done,
    label: 'done',
  },
  {
    email: process.env.E2E_USER_NEW_EMAIL ?? 'e2e-new@test.sami.local',
    password: process.env.E2E_USER_PASSWORD ?? 'Test@12345',
    file: STORAGE.new,
    label: 'new',
  },
]

for (const user of USERS) {
  setup(`login as ${user.label} user`, async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[name="email"]', user.email)
    await page.fill('input[name="password"]', user.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/app\//, { timeout: 45_000 })

    await page.context().storageState({ path: user.file })
  })
}
