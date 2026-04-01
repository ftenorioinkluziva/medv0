import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
}

// ---------------------------------------------------------------------------
// Suite 1: Route Guards (no auth)
// ---------------------------------------------------------------------------

test.describe('Dashboard — Route Guards', () => {
  test('T-DB-01 — unauthenticated user is redirected to login', async ({ page }) => {
    // #given - no session
    // #when
    await page.goto('/app/dashboard')

    // #then
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

// ---------------------------------------------------------------------------
// Suite 2: Mobile viewport (authenticated)
// ---------------------------------------------------------------------------

test.describe('Dashboard — Mobile Viewport (390px)', () => {
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

  test('T-DB-02 — bottom navigation renders with 3 items', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    // #when
    const nav = page.getByRole('navigation', { name: 'Navegação principal' })

    // #then
    await expect(nav).toBeVisible()
    const links = nav.getByRole('link')
    await expect(links).toHaveCount(3)
  })

  test('T-DB-03 — bottom nav links point to correct routes', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    // #when
    const nav = page.getByRole('navigation', { name: 'Navegação principal' })
    const hrefs = await nav.getByRole('link').evaluateAll(
      (els) => els.map((el) => el.getAttribute('href')),
    )

    // #then
    expect(hrefs).toContain('/app/dashboard')
    expect(hrefs).toContain('/app/history')
    expect(hrefs).toContain('/app/profile')
  })

  test('T-DB-04 — page renders without JS errors', async ({ page }) => {
    // #given
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // #when
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    // #then
    expect(errors).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Suite 3: Empty state (new user — no auth state needed if using new account)
// ---------------------------------------------------------------------------
// NOTE (L3 from QA gate): T-DB-05 uses the shared auth storage state (a user that may have
// exams). It does not verify the actual empty-state flow for a new user with zero documents.
// To cover that path, add a dedicated E2E fixture: tests/e2e/fixtures/new-user-storage.json
// seeded via pnpm test:e2e:seed --user=new, then assert EmptyStateCard is rendered.
// Tracked: docs/stories/5.1.story.md — future improvement, not blocking AC coverage.

test.describe('Dashboard — Empty state for new user', () => {
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

  test('T-DB-05 — dashboard shows "Novo exame" CTA always visible', async ({ page }) => {
    // #given
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    // #when
    const cta = page.getByRole('link', { name: 'Novo exame' })

    // #then — CTA always present regardless of state
    await expect(cta).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Suite 4: Skeleton loader visibility
// ---------------------------------------------------------------------------

test.describe('Dashboard — Skeleton loader', () => {
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

  test('T-DB-06 — skeleton aria-label visible while page loads (SSR check)', async ({ page }) => {
    // #given — intercept RSC payload to hold data fetch and expose the suspense skeleton
    let resolveDelay!: () => void
    const delayPromise = new Promise<void>((resolve) => { resolveDelay = resolve })

    await page.route('**/_next/data/**dashboard**', async (route) => {
      await delayPromise
      await route.continue()
    })

    // #when — navigate without awaiting so we can observe interim state
    const navPromise = page.goto('/app/dashboard')

    // #then — skeleton must be attached before data resolves
    const skeletonVisible = await page
      .waitForSelector('[aria-label="Carregando dashboard..."]', {
        timeout: 3000,
        state: 'attached',
      })
      .then(() => true)
      .catch(() => false)

    resolveDelay()
    await navPromise
    await page.waitForLoadState('networkidle')

    // If SSR is so fast the skeleton never hits the DOM, the test documents it explicitly
    // rather than silently passing — a skeletonVisible=false result should be investigated
    expect(skeletonVisible, 'DashboardSkeleton should be visible during suspense — if SSR resolves before first paint, add data-testid and assert on network-idle instead').toBe(true)
  })
})
