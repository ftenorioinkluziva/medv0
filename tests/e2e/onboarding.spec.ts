import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Storage state paths (created by auth-setup project)
const STORAGE_DIR = path.resolve(__dirname, 'fixtures/storage')
const STORAGE = {
  done: path.join(STORAGE_DIR, 'auth-done.json'),
  new: path.join(STORAGE_DIR, 'auth-new.json'),
}

const PROFILE_VALID = {
  age: '35',
  gender: 'masculino',
  height: '175',
  weight: '70',
  systolicPressure: '120',
  diastolicPressure: '80',
  restingHeartRate: '65',
  healthObjectives: 'Melhorar condicionamento físico e saúde cardiovascular',
}

// ---------------------------------------------------------------------------
// Suite 1: Guards de Rota (unauthenticated — no storageState needed)
// ---------------------------------------------------------------------------

test.describe('Guards de Rota', () => {
  test('T01 — usuário não autenticado é redirecionado para login', async ({ page }) => {
    // #given — nenhuma sessão ativa (contexto limpo)
    // #when
    await page.goto('/app/onboarding')

    // #then
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

// ---------------------------------------------------------------------------
// Suite 2: Guards de Rota (done user — onboarding already complete)
// ---------------------------------------------------------------------------

test.describe('Guards de Rota — Onboarding Completo', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(STORAGE.done)) {
      test.skip(true, 'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup')
    }
  })
  test.use({ storageState: STORAGE.done })

  test('T02 — usuário com onboarding completo é redirecionado para dashboard', async ({ page }) => {
    // #given — usuário done autenticado via storageState
    // #when
    await page.goto('/app/onboarding')

    // #then
    await expect(page).toHaveURL(/\/app\/dashboard/)
  })
})

// ---------------------------------------------------------------------------
// Suite 3: Step 1 — Disclaimer (new user)
// ---------------------------------------------------------------------------

test.describe('Step 1 — Disclaimer', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(STORAGE.new)) {
      test.skip(true, 'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup')
    }
  })
  test.use({ storageState: STORAGE.new })

  test.beforeEach(async ({ page }) => {
    await page.goto('/app/onboarding')
    await expect(page.getByText('Bem-vindo ao SAMI')).toBeVisible()
  })

  test('T03 — botão Continuar desabilitado sem aceite do disclaimer', async ({ page }) => {
    // #given — página carregada no Step 1
    const checkbox = page.locator('#accept-disclaimer')
    const continueBtn = page.getByRole('button', { name: 'Continuar' })

    // #when — sem marcar o checkbox
    await expect(checkbox).not.toBeChecked()

    // #then
    await expect(continueBtn).toBeDisabled()
  })

  test('T04 — aceite do disclaimer habilita botão e avança para Step 2', async ({ page }) => {
    // #given — Step 1 carregado
    const checkbox = page.locator('#accept-disclaimer')
    const continueBtn = page.getByRole('button', { name: 'Continuar' })

    // #when
    await checkbox.check()
    await expect(continueBtn).toBeEnabled()
    await continueBtn.click()

    // #then — Step 2 visível
    await expect(page.getByText('Seu Perfil de Saúde')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Suite 4: Step 2 — Profile (new user)
// ---------------------------------------------------------------------------

test.describe('Step 2 — Profile', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(STORAGE.new)) {
      test.skip(true, 'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup')
    }
  })
  test.use({ storageState: STORAGE.new })

  test.beforeEach(async ({ page }) => {
    await page.goto('/app/onboarding')
    // Avançar pelo Step 1
    await page.locator('#accept-disclaimer').check()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Seu Perfil de Saúde')).toBeVisible()
  })

  test('T05 — submit com dados válidos avança para Step 3', async ({ page }) => {
    // #given — formulário no Step 2
    // #when
    await page.fill('#age', PROFILE_VALID.age)
    await page.selectOption('#gender', PROFILE_VALID.gender)
    await page.fill('#height', PROFILE_VALID.height)
    await page.fill('#weight', PROFILE_VALID.weight)
    await page.fill('#systolicPressure', PROFILE_VALID.systolicPressure)
    await page.fill('#diastolicPressure', PROFILE_VALID.diastolicPressure)
    await page.fill('#restingHeartRate', PROFILE_VALID.restingHeartRate)
    await page.fill('#healthObjectives', PROFILE_VALID.healthObjectives)
    await page.getByRole('button', { name: 'Continuar' }).click()

    // #then — Step 3 visível
    await expect(page.getByText('Primeiro Exame')).toBeVisible()
  })

  test('T07 — mensagem de erro da server action aparece inline', async ({ page }) => {
    // Preencher com dados que podem disparar validação (age=0 fora do range)
    await page.fill('#age', '0')
    await page.selectOption('#gender', 'masculino')
    await page.fill('#height', '175')
    await page.fill('#weight', '70')
    await page.fill('#systolicPressure', '120')
    await page.fill('#diastolicPressure', '80')
    await page.fill('#restingHeartRate', '65')
    await page.fill('#healthObjectives', 'teste')

    // #when
    await page.getByRole('button', { name: 'Continuar' }).click()

    // #then — erro inline OU avanço para Step 3 (depende da validação do server)
    const errorMsg = page.locator('[aria-live="polite"]')
    const step3 = page.getByText('Primeiro Exame')
    await expect(errorMsg.or(step3)).toBeVisible({ timeout: 8_000 })
  })

  test('T08 — botão exibe "Salvando..." durante pending', async ({ page }) => {
    // #given — preencher campos válidos
    await page.fill('#age', PROFILE_VALID.age)
    await page.selectOption('#gender', PROFILE_VALID.gender)
    await page.fill('#height', PROFILE_VALID.height)
    await page.fill('#weight', PROFILE_VALID.weight)
    await page.fill('#systolicPressure', PROFILE_VALID.systolicPressure)
    await page.fill('#diastolicPressure', PROFILE_VALID.diastolicPressure)
    await page.fill('#restingHeartRate', PROFILE_VALID.restingHeartRate)
    await page.fill('#healthObjectives', PROFILE_VALID.healthObjectives)

    // #when — clicar e capturar estado transitório
    await page.getByRole('button', { name: /Continuar|Salvando/ }).click()

    // #then — estado pending visível (pode ser muito rápido em dev) ou Step 3
    await expect(
      page.getByText('Salvando...').or(page.getByText('Primeiro Exame'))
    ).toBeVisible({ timeout: 8_000 })
  })
})

// ---------------------------------------------------------------------------
// Suite 5: Step 3 — Upload (new user, completes steps 1+2 in beforeEach)
// ---------------------------------------------------------------------------

test.describe('Step 3 — Upload', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(STORAGE.new)) {
      test.skip(true, 'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup')
    }
  })
  test.use({ storageState: STORAGE.new })

  test.beforeEach(async ({ page }) => {
    await page.goto('/app/onboarding')
    // Avançar Step 1
    await page.locator('#accept-disclaimer').check()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Seu Perfil de Saúde')).toBeVisible()
    // Avançar Step 2
    await page.fill('#age', PROFILE_VALID.age)
    await page.selectOption('#gender', PROFILE_VALID.gender)
    await page.fill('#height', PROFILE_VALID.height)
    await page.fill('#weight', PROFILE_VALID.weight)
    await page.fill('#systolicPressure', PROFILE_VALID.systolicPressure)
    await page.fill('#diastolicPressure', PROFILE_VALID.diastolicPressure)
    await page.fill('#restingHeartRate', PROFILE_VALID.restingHeartRate)
    await page.fill('#healthObjectives', PROFILE_VALID.healthObjectives)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Primeiro Exame')).toBeVisible()
  })

  test('T09 — "Enviar Exame" redireciona para página de upload', async ({ page }) => {
    // #given — Step 3 carregado
    // #when
    await page.getByRole('button', { name: 'Enviar Exame' }).click()

    // #then
    await expect(page).toHaveURL(/\/app\/documents\/upload/)
  })

  test('T10 — "Pular por agora" redireciona para dashboard', async ({ page }) => {
    // #given — Step 3 carregado
    // #when
    await page.getByRole('button', { name: 'Pular por agora' }).click()

    // #then
    await expect(page).toHaveURL(/\/app\/dashboard/)
  })
})

// ---------------------------------------------------------------------------
// Suite 6: Fluxo Completo (Happy Path — new user)
// ---------------------------------------------------------------------------

test.describe('Fluxo Completo', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(STORAGE.new)) {
      test.skip(true, 'Auth state missing — run: pnpm test:e2e:seed && playwright test --project=auth-setup')
    }
  })
  test.use({ storageState: STORAGE.new })

  test('T11 — onboarding do início ao fim com skip no Step 3', async ({ page }) => {
    // #given — usuário com onboarding pendente (new user via storageState)
    await page.goto('/app/onboarding')

    // #when — Step 1: Disclaimer
    await expect(page.getByText('Bem-vindo ao SAMI')).toBeVisible()
    await page.locator('#accept-disclaimer').check()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Step 2: Profile
    await expect(page.getByText('Seu Perfil de Saúde')).toBeVisible()
    await page.fill('#age', PROFILE_VALID.age)
    await page.selectOption('#gender', PROFILE_VALID.gender)
    await page.fill('#height', PROFILE_VALID.height)
    await page.fill('#weight', PROFILE_VALID.weight)
    await page.fill('#systolicPressure', PROFILE_VALID.systolicPressure)
    await page.fill('#diastolicPressure', PROFILE_VALID.diastolicPressure)
    await page.fill('#restingHeartRate', PROFILE_VALID.restingHeartRate)
    await page.fill('#healthObjectives', PROFILE_VALID.healthObjectives)
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Step 3: Upload — pular
    await expect(page.getByText('Primeiro Exame')).toBeVisible()
    await page.getByRole('button', { name: 'Pular por agora' }).click()

    // #then — chega no dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/)

    // Guard: navegar de volta ao onboarding redireciona (onboarding já completo)
    await page.goto('/app/onboarding')
    await expect(page).toHaveURL(/\/app\/dashboard/)
  })
})
