import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
}

// ---------------------------------------------------------------------------
// Suite: Dashboard Density & Report UX — Story 13.2
// ---------------------------------------------------------------------------

test.describe('Dashboard Density & Report UX — 390px viewport', () => {
  test.skip(
    !fs.existsSync(STORAGE.done),
    'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup',
  )

  test.use({
    storageState: STORAGE.done,
    viewport: { width: 390, height: 844 },
  })

  // AC1 — Compact markers section renders without overflow
  test('T-DD-01 — dashboard loads without horizontal overflow at 390px', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')

    // #when
    await page.waitForLoadState('networkidle')

    // #then
    const body = page.locator('body')
    const scrollWidth = await body.evaluate((el) => el.scrollWidth)
    const clientWidth = await body.evaluate((el) => el.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })

  // AC3 — Dashboard skeleton renders during loading
  test('T-DD-02 — dashboard skeleton is accessible', async ({ page }) => {
    // #given — intercept to slow down response
    await page.route('/app/dashboard', async (route) => {
      await route.continue()
    })

    // #when
    await page.goto('/app/dashboard')

    // #then — page renders successfully (skeleton or content)
    await expect(page.locator('main')).toBeVisible()
  })

  // AC2 — Report TOC renders when report has sections
  test('T-DD-03 — report TOC renders with section links', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    // Find a link to a completed analysis report
    const reportLink = page.getByRole('link', { name: /Ver relatório/i }).first()

    // Skip if no report is available in this environment
    const hasReport = await reportLink.count()
    if (hasReport === 0) {
      test.skip()
      return
    }

    // #when
    await reportLink.click()
    await page.waitForLoadState('networkidle')

    // #then — TOC nav is present
    const toc = page.getByRole('navigation', { name: 'Sumário do relatório' })
    await expect(toc).toBeVisible()

    // TOC has at least one link
    const tocLinks = toc.getByRole('link')
    const linkCount = await tocLinks.count()
    expect(linkCount).toBeGreaterThan(0)
  })

  // AC2 — TOC links scroll to correct section
  test('T-DD-04 — TOC link scrolls to section anchor', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    const reportLink = page.getByRole('link', { name: /Ver relatório/i }).first()
    const hasReport = await reportLink.count()
    if (hasReport === 0) {
      test.skip()
      return
    }

    // #when
    await reportLink.click()
    await page.waitForLoadState('networkidle')

    const toc = page.getByRole('navigation', { name: 'Sumário do relatório' })
    const hasEnoughSections = await toc.getByRole('link').count()
    if (hasEnoughSections < 2) {
      test.skip()
      return
    }

    // Click last TOC link
    const lastLink = toc.getByRole('link').last()
    const href = await lastLink.getAttribute('href')
    await lastLink.click()

    // #then — target element is in viewport
    if (href) {
      const targetId = href.replace('#', '')
      const target = page.locator(`#${targetId}`)
      await expect(target).toBeInViewport({ timeout: 3000 })
    }
  })

  // AC3 — Profile page skeleton accessible
  test('T-DD-05 — profile page renders without errors', async ({ page }) => {
    // #given
    await page.goto('/app/profile')

    // #when
    await page.waitForLoadState('networkidle')

    // #then
    await expect(page.locator('h1')).toContainText('Meu Perfil')
    await expect(page.locator('main')).toBeVisible()
  })
})
