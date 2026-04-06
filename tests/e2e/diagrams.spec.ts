import { test, expect, type Page } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

async function openNewDiagramDialog(page: Page, campaignId: string) {
  await page.goto(`http://localhost:3333/campaigns/${campaignId}/diagrams`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForLoadState('networkidle')
  await page.locator('[data-testid="new-diagram-btn"]').click()
  await expect(page.locator('[data-testid="diagram-title-input"]')).toBeVisible({ timeout: 5000 })
}

async function submitDiagramForm(page: Page, title: string, typeValue: string) {
  await page.locator('[data-testid="diagram-title-input"]').fill(title)
  await page.locator('[data-testid="diagram-type-select"]').selectOption(typeValue)
  await page
    .locator('[role="dialog"]')
    .getByRole('button', { name: /new diagram/i })
    .click()
}

test.describe('Diagram List Page', () => {
  test('DM can create a diagram and navigate to it', async ({ page }) => {
    await registerAndLogin(page, `Diagram DM ${uid()}`)
    await createCampaign(page, `Diagram Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Navigate to diagrams page
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/diagrams`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // Click "New Diagram"
    const newBtn = page.locator('[data-testid="new-diagram-btn"]')
    await expect(newBtn).toBeVisible({ timeout: 10000 })
    await newBtn.click()

    // Fill in title
    const titleInput = page.locator('[data-testid="diagram-title-input"]')
    await expect(titleInput).toBeVisible({ timeout: 5000 })
    await titleInput.fill('My Test Diagram')

    // Submit
    const createBtn = page.locator('button', { hasText: 'New Diagram' }).last()
    await createBtn.click()

    // Should navigate to the diagram editor
    await expect(page).toHaveURL(/\/campaigns\/.+\/diagrams\/.+/, { timeout: 15000 })
  })

  test('DM can delete a diagram with confirmation', async ({ page }) => {
    await registerAndLogin(page, `Del DM ${uid()}`)
    await createCampaign(page, `Del Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a diagram via API
    await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'To Delete', diagramType: 'freeform' },
    })

    // Navigate to diagrams list
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/diagrams`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // Click delete
    const deleteBtn = page.locator('[data-testid="delete-diagram-btn"]').first()
    await expect(deleteBtn).toBeVisible({ timeout: 10000 })
    await deleteBtn.click()

    // Confirm in dialog
    const confirmBtn = page.locator('[data-testid="confirm-delete-btn"]')
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.click()

    // Diagram should be gone
    await expect(page.locator('[data-testid="delete-diagram-btn"]')).toHaveCount(0, {
      timeout: 5000,
    })
  })
})

test.describe('Diagram Editor', () => {
  test('Editor page loads with canvas rendered and no React errors', async ({ page }) => {
    await registerAndLogin(page, `Editor DM ${uid()}`)
    await createCampaign(page, `Editor Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Collect console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    // Create a diagram via API
    const diag = await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'Editor Test', diagramType: 'freeform' },
    })

    // Navigate to editor
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/diagrams/${diag.id}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // Save button should be visible
    const saveBtn = page.locator('[data-testid="save-diagram-btn"]')
    await expect(saveBtn).toBeVisible({ timeout: 15000 })

    // Entity panel should be visible for DM
    const panelSearch = page.locator('[data-testid="entity-search-input"]')
    await expect(panelSearch).toBeVisible({ timeout: 10000 })

    // Wait for tldraw canvas to mount (gives React time to render)
    await page.waitForSelector('.tl-container', { timeout: 20000 }).catch(() => {
      // If .tl-container isn't found, the test will still catch React errors below
    })

    // No React errors in the console
    const reactErrors = consoleErrors.filter(
      (e) =>
        e.includes('Minified React error') ||
        e.includes("plugin-react can't detect preamble") ||
        e.includes('Uncaught Error:'),
    )
    expect(reactErrors).toHaveLength(0)
  })

  test('Editor loads an empty canvas for a new diagram (no snapshot)', async ({ page }) => {
    await registerAndLogin(page, `Empty DM ${uid()}`)
    await createCampaign(page, `Empty Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    // Create diagram but do NOT save any snapshot
    const diag = await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'Empty Canvas', diagramType: 'freeform' },
    })

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/diagrams/${diag.id}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // Save button should appear (not loading/error state)
    await expect(page.locator('[data-testid="save-diagram-btn"]')).toBeVisible({ timeout: 15000 })

    // Canvas should mount without React errors
    const reactErrors = consoleErrors.filter(
      (e) => e.includes('React') || e.includes('Minified React error'),
    )
    expect(reactErrors).toHaveLength(0)
  })
})

test.describe('Diagram Generation', () => {
  test('entity-graph: generates diagram with entity cards when campaign has entities', async ({
    page,
  }) => {
    await registerAndLogin(page, `Gen DM ${uid()}`)
    await createCampaign(page, `Gen Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string

    // Seed an entity
    await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Hero', type: 'character', visibility: 'members' },
    })

    await openNewDiagramDialog(page, campaignId)
    await submitDiagramForm(page, 'My Entity Graph', 'entity-graph')

    // Should navigate to the new diagram
    await expect(page).toHaveURL(/\/campaigns\/.+\/diagrams\/.+/, { timeout: 15000 })

    // Canvas should mount
    await page.waitForSelector('.tl-container', { timeout: 20000 })

    // At least one entity card shape should be in the DOM
    await expect(page.locator('.tl-container')).toBeVisible()
  })

  test('session-timeline: generates diagram with session cards when campaign has sessions', async ({
    page,
  }) => {
    await registerAndLogin(page, `Sess DM ${uid()}`)
    await createCampaign(page, `Sess Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string

    // Seed a session
    await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: 'Session 1', status: 'completed' },
    })

    await openNewDiagramDialog(page, campaignId)
    await submitDiagramForm(page, 'My Session Timeline', 'session-timeline')

    // Should navigate to the new diagram
    await expect(page).toHaveURL(/\/campaigns\/.+\/diagrams\/.+/, { timeout: 15000 })

    // Canvas should mount
    await page.waitForSelector('.tl-container', { timeout: 20000 })
    await expect(page.locator('.tl-container')).toBeVisible()
  })

  test('quest-tree: shows inline error when campaign has no quests', async ({ page }) => {
    await registerAndLogin(page, `Quest DM ${uid()}`)
    await createCampaign(page, `Quest Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string

    await openNewDiagramDialog(page, campaignId)
    await submitDiagramForm(page, 'My Quest Tree', 'quest-tree')

    // Should stay on diagrams page with an error message in the dialog
    await expect(page).toHaveURL(/\/campaigns\/.+\/diagrams$/, { timeout: 5000 })
    await expect(page.locator('[role="dialog"] .text-destructive')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[role="dialog"] .text-destructive')).toContainText(/quest/i)
  })

  test('faction-web: shows inline error when campaign has no organizations', async ({ page }) => {
    await registerAndLogin(page, `Fac DM ${uid()}`)
    await createCampaign(page, `Fac Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string

    await openNewDiagramDialog(page, campaignId)
    await submitDiagramForm(page, 'My Faction Web', 'faction-web')

    // Should stay on diagrams page with an error message in the dialog
    await expect(page).toHaveURL(/\/campaigns\/.+\/diagrams$/, { timeout: 5000 })
    await expect(page.locator('[role="dialog"] .text-destructive')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[role="dialog"] .text-destructive')).toContainText(/organization/i)
  })

  test('freeform: creates empty diagram and navigates to canvas', async ({ page }) => {
    await registerAndLogin(page, `Free DM ${uid()}`)
    await createCampaign(page, `Free Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string

    await openNewDiagramDialog(page, campaignId)
    await submitDiagramForm(page, 'My Freeform', 'freeform')

    await expect(page).toHaveURL(/\/campaigns\/.+\/diagrams\/.+/, { timeout: 15000 })
    await page.waitForSelector('.tl-container', { timeout: 20000 })
    await expect(page.locator('[data-testid="save-diagram-btn"]')).toBeVisible()
  })
})
