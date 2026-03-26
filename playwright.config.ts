import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    // 1. Auth setup — login once, save storage states (runs before all tests)
    {
      name: 'auth-setup',
      testMatch: '**/setup/auth.setup.ts',
      use: { ...devices['iPhone 14 Pro'] },
      timeout: 180_000, // Allow for Next.js cold start compilation
    },

    // 2. All tests — storage state injected per-test via loginAs()
    {
      name: 'Mobile Chrome',
      testMatch: '**/*.spec.ts',
      dependencies: ['auth-setup'],
      use: { ...devices['iPhone 14 Pro'] },
    },
  ],

  webServer: {
    command: process.env.CI ? 'pnpm build && pnpm start' : 'pnpm dev',
    // Wait for an actual HTTP response, not just port open
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // 3 minutes for Next.js cold start + first compile
    timeout: 180_000,
  },
})
