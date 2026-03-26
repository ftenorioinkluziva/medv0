import { Page, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const STORAGE_DIR = path.resolve(__dirname, 'storage')

function storagePathFor(email: string): string {
  if (email.includes('done')) return path.join(STORAGE_DIR, 'auth-done.json')
  return path.join(STORAGE_DIR, 'auth-new.json')
}

/**
 * Authenticates a test user by loading the pre-saved storage state (cookies).
 * Storage states are created by the auth-setup project (tests/e2e/setup/auth.setup.ts).
 * This avoids slow UI login on every test.
 */
export async function loginAs(page: Page, email: string, _password: string) {
  const storagePath = storagePathFor(email)

  if (!fs.existsSync(storagePath)) {
    test.skip(true, `Auth state not found for ${email} — run: pnpm test:e2e:seed && pnpm exec playwright test --project=auth-setup`)
    return
  }

  const state = JSON.parse(fs.readFileSync(storagePath, 'utf8')) as {
    cookies: Parameters<typeof page.context.prototype.addCookies>[0]
    origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>
  }

  await page.context().addCookies(state.cookies ?? [])
}
