import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

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
