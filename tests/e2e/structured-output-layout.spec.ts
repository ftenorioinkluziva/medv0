import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
}

const MOCK_ANALYSIS_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

// ---------------------------------------------------------------------------
// Suite: Structured Output Layout — 390px viewport (AC5)
// ---------------------------------------------------------------------------

test.describe('Structured Output — 390px Layout', () => {
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

  test('T-SO-01 — análise page renders at 390px without horizontal overflow', async ({ page }) => {
    // #given
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    // #when
    await page.goto(`/app/analyses/${MOCK_ANALYSIS_ID}`)
    await expect(page.locator('body')).toBeVisible()

    // #then — no horizontal overflow (page-level check)
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = 390
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 2) // 2px tolerance

    const criticalErrors = jsErrors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('T-SO-02 — main container fits within 390px', async ({ page }) => {
    // #given
    await page.goto(`/app/analyses/${MOCK_ANALYSIS_ID}`)

    // #when
    const main = page.locator('main')
    await expect(main).toBeVisible()
    const box = await main.boundingBox()

    // #then
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390)
    }
  })
})
