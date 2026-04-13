import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
}

// ---------------------------------------------------------------------------
// Suite: Mobile Layout — AC1 (BottomNav), AC6 (no horizontal overflow)
// ---------------------------------------------------------------------------

test.describe('Mobile Layout — 390px viewport', () => {
  test.skip(
    !fs.existsSync(STORAGE.done),
    'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup',
  )

  test.use({
    storageState: STORAGE.done,
    viewport: { width: 390, height: 844 },
  })

  // AC1 — Bottom nav bar is visible with 4 items
  test('T-ML-01 — bottom nav has 4 items on dashboard', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')

    // #when
    const nav = page.getByRole('navigation', { name: 'Navegação principal' })

    // #then
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link')).toHaveCount(4)
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Upload' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Histórico' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Perfil' })).toBeVisible()
  })

  // AC1 — Active item is highlighted
  test('T-ML-02 — active nav item is highlighted', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')

    // #when
    const dashboardLink = page.getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Dashboard' })

    // #then - active link has text-primary (not text-muted-foreground)
    await expect(dashboardLink).toHaveAttribute('class', /text-primary/)
  })

  // AC1 — Bottom nav does not appear on auth pages
  test('T-ML-03 — bottom nav absent on auth pages', async ({ page }) => {
    // #given - unauthenticated page
    // #when
    await page.goto('/auth/login')

    // #then
    const nav = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(nav).not.toBeVisible()
  })

  // AC6 — No horizontal overflow on dashboard
  test('T-ML-04 — dashboard has no horizontal overflow at 390px', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    // #when
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    // #then
    expect(hasOverflow).toBe(false)
  })

  // AC6 — No horizontal overflow on upload page
  test('T-ML-05 — upload page has no horizontal overflow at 390px', async ({ page }) => {
    // #given
    await page.goto('/app/upload')
    await page.waitForLoadState('networkidle')

    // #when
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    // #then
    expect(hasOverflow).toBe(false)
  })

  // AC6 — No horizontal overflow on profile page
  test('T-ML-06 — profile page has no horizontal overflow at 390px', async ({ page }) => {
    // #given
    await page.goto('/app/profile')
    await page.waitForLoadState('networkidle')

    // #when
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    // #then
    expect(hasOverflow).toBe(false)
  })

  // AC6 — No horizontal overflow on history page
  test('T-ML-07 — history page has no horizontal overflow at 390px', async ({ page }) => {
    // #given
    await page.goto('/app/history')
    await page.waitForLoadState('networkidle')

    // #when
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    // #then
    expect(hasOverflow).toBe(false)
  })
})
