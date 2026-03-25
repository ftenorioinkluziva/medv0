import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['iPhone 14 Pro'] },
    },
  ],

  webServer: process.env.CI ? {
    command: 'pnpm build && pnpm start',
    port: 3000,
    reuseExistingServer: false,
    timeout: 120_000,
  } : undefined,
})
