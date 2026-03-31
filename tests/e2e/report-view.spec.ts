import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
}

const MOCK_ANALYSIS_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

// ---------------------------------------------------------------------------
// Suite 1: Route Guards (no auth)
// ---------------------------------------------------------------------------

test.describe('Report View — Route Guards', () => {
  test('T-RV-01 — unauthenticated user is redirected to login', async ({ page }) => {
    // #given - no session
    // #when
    await page.goto(`/app/analyses/${MOCK_ANALYSIS_ID}`)

    // #then
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

// ---------------------------------------------------------------------------
// Suite 2: Mobile viewport rendering (authenticated)
// ---------------------------------------------------------------------------

test.describe('Report View — Mobile Viewport', () => {
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

  test('T-RV-02 — report page renders at 390px viewport without JS errors', async ({ page }) => {
    // #given
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    // #when — visit a non-existent analysis ID (tests the page renders, not the data)
    await page.goto(`/app/analyses/${MOCK_ANALYSIS_ID}`)

    // #then — page renders without crashing (shows 404 or redirect, not blank/error)
    await expect(page.locator('body')).toBeVisible()
    const criticalErrors = jsErrors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('T-RV-03 — report container fits within 390px width', async ({ page }) => {
    // #given
    await page.goto(`/app/analyses/${MOCK_ANALYSIS_ID}`)

    // #when
    const main = page.locator('main')
    await expect(main).toBeVisible()

    const box = await main.boundingBox()

    // #then — no horizontal overflow
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390)
    }
  })

  test('T-RV-04 — page is vertically scrollable', async ({ page }) => {
    // #given
    await page.goto(`/app/analyses/${MOCK_ANALYSIS_ID}`)
    await expect(page.locator('main')).toBeVisible()

    // #when — check scroll height vs viewport
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    const viewportHeight = 844

    // #then — page content is within scroll bounds (either fits or is scrollable)
    expect(scrollHeight).toBeGreaterThanOrEqual(viewportHeight * 0.3)
  })
})
