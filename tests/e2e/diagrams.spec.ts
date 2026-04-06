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
  test('Editor page loads with canvas and save button', async ({ page }) => {
    await registerAndLogin(page, `Editor DM ${uid()}`)
    await createCampaign(page, `Editor Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

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
  })
})
