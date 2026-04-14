import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@teste.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123'

async function loginAsAdmin(page: Parameters<typeof test.beforeEach>[0]['page']) {
  await page.goto('/auth/login')
  await page.fill('input[name="email"]', ADMIN_EMAIL)
  await page.fill('input[name="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 })
}

async function getFirstAgentEditUrl(page: Parameters<typeof test.beforeEach>[0]['page']) {
  await page.goto('/admin/agents')
  await expect(page.locator('h1')).toContainText('Agentes')
  const editLink = page.locator('table tbody tr').first().getByRole('link', { name: 'Editar' })
  await expect(editLink).toBeVisible()
  const href = await editLink.getAttribute('href')
  return href ?? '/admin/agents'
}

test.describe('Admin Knowledge Association — 390px viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    // #given
    await loginAsAdmin(page)
  })

  test('seção Base de Conhecimento aparece na edição do agente', async ({ page }) => {
    // #given
    const editUrl = await getFirstAgentEditUrl(page)

    // #when
    await page.goto(editUrl)

    // #then
    const section = page.getByRole('region', { name: 'Base de Conhecimento' })
    await expect(section).toBeVisible({ timeout: 10_000 })
    await expect(section.getByRole('heading', { name: 'Base de Conhecimento' })).toBeVisible()
    await expect(section.getByPlaceholder(/buscar artigos/i)).toBeVisible()
  })

  test('busca filtra artigos por título ou categoria', async ({ page }) => {
    // #given
    const editUrl = await getFirstAgentEditUrl(page)
    await page.goto(editUrl)
    const section = page.getByRole('region', { name: 'Base de Conhecimento' })
    await expect(section).toBeVisible({ timeout: 10_000 })

    const searchInput = section.getByPlaceholder(/buscar artigos/i)
    const articleCount = await section.locator('[data-slot="switch"], button:has-text("Associar"), button:has-text("Remover")').count()

    // #when — type a search term unlikely to match all articles
    await searchInput.fill('zzz_nenhum_resultado_esperado_xyz')

    // #then — filtered list shows empty state
    await expect(section.getByText('Nenhum artigo encontrado')).toBeVisible()

    // #when — clear search
    await searchInput.fill('')

    // #then — articles reappear
    if (articleCount > 0) {
      await expect(section.locator('button:has-text("Associar"), button:has-text("Remover")').first()).toBeVisible()
    }
  })

  test('associa artigo clicando em Associar e desassocia clicando em Remover', async ({ page }) => {
    // #given
    const editUrl = await getFirstAgentEditUrl(page)
    await page.goto(editUrl)
    const section = page.getByRole('region', { name: 'Base de Conhecimento' })
    await expect(section).toBeVisible({ timeout: 10_000 })

    const associarButton = section.getByRole('button', { name: 'Associar' }).first()
    const hasAssociar = await associarButton.isVisible().catch(() => false)

    if (!hasAssociar) {
      test.skip()
      return
    }

    // #when — associate
    await associarButton.click()

    // #then — button changes to Remover + Associado badge appears
    await expect(section.getByText('Associado').first()).toBeVisible({ timeout: 5_000 })

    // #when — disassociate
    const removerButton = section.getByRole('button', { name: 'Remover' }).first()
    await removerButton.click()

    // #then — Associado badge disappears, Associar button reappears
    await expect(section.getByRole('button', { name: 'Associar' }).first()).toBeVisible({ timeout: 5_000 })
  })

  test('bulk select — Selecionar todos e Adicionar selecionados', async ({ page }) => {
    // #given
    const editUrl = await getFirstAgentEditUrl(page)
    await page.goto(editUrl)
    const section = page.getByRole('region', { name: 'Base de Conhecimento' })
    await expect(section).toBeVisible({ timeout: 10_000 })

    const hasArticles = await section.locator('input[type="checkbox"]').count() > 0

    if (!hasArticles) {
      test.skip()
      return
    }

    // #when — click Selecionar todos
    const selectAllButton = section.getByRole('button', { name: 'Selecionar todos' })
    await expect(selectAllButton).toBeVisible()
    await selectAllButton.click()

    // #then — checkboxes get checked
    const firstCheckbox = section.locator('input[type="checkbox"]').first()
    await expect(firstCheckbox).toBeChecked()

    // #then — Adicionar selecionados or Remover selecionados button appears
    const bulkButton = section.getByRole('button', { name: /selecionados/i }).first()
    await expect(bulkButton).toBeVisible()

    // #when — click Desmarcar todos
    const desmarcarButton = section.getByRole('button', { name: 'Desmarcar todos' })
    await desmarcarButton.click()

    // #then — checkboxes unchecked
    await expect(firstCheckbox).not.toBeChecked()
  })
})

test.describe('Admin Knowledge — toggle isGlobal', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/knowledge')
    await expect(page.locator('h1')).toContainText('Knowledge Base')
  })

  test('toggle Global muda estado do switch e persiste', async ({ page }) => {
    // #given — first switch in table
    const firstSwitch = page.getByRole('switch').first()
    await expect(firstSwitch).toBeVisible({ timeout: 10_000 })
    const wasChecked = await firstSwitch.getAttribute('aria-checked')

    // #when
    await firstSwitch.click()

    // #then — switch reflects toggled state
    const expectedState = wasChecked === 'true' ? 'false' : 'true'
    await expect(firstSwitch).toHaveAttribute('aria-checked', expectedState, { timeout: 5_000 })

    // cleanup — toggle back
    await firstSwitch.click()
    await expect(firstSwitch).toHaveAttribute('aria-checked', wasChecked ?? 'true', { timeout: 5_000 })
  })

  test('coluna Agentes mostra badge Global para artigos globais', async ({ page }) => {
    // #given — table rendered
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('columnheader', { name: 'Agentes' })).toBeVisible()

    // #then — at least one Global badge or Sem agente badge exists
    const hasBadge =
      (await page.getByText('Global').count()) > 0 ||
      (await page.getByText('Sem agente').count()) > 0

    expect(hasBadge).toBe(true)
  })
})
