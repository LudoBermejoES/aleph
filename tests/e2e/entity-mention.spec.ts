import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Entity @mention autocomplete (9.17)', () => {
  test('type @ in editor → see entity suggestions → select one', async ({ page }) => {
    await registerAndLogin(page, 'MentionE2E')
    await createCampaign(page, `Mention ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create entities to search for
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Strahd von Zarovich', type: 'character', content: '# Strahd' }),
      })
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Barovia Village', type: 'location', content: '# Barovia' }),
      })
    }, campaignId)

    // Navigate through the UI (direct goto doesn't hydrate properly)
    await page.click('aside >> text=Wiki')
    await expect(async () => { expect(page.url()).toContain('/entities') }).toPass({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click New Entity button to navigate to /entities/new
    await page.click('[data-testid="new-entity-btn"]')
    await expect(async () => { expect(page.url()).toContain('/entities/new') }).toPass({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Wait for the form to render
    await expect(page.locator('h1:has-text("New Entity")')).toBeVisible({ timeout: 15000 })

    // Fill name so the form is valid
    await page.fill('input[placeholder="Entity name"]', `MentionTest ${uid()}`)

    // Wait for Tiptap to mount — it adds .ProseMirror class after init
    // Use the prose container div and wait for ProseMirror to appear inside it
    const editorContainer = page.locator('.prose.min-h-\\[200px\\]')
    await expect(editorContainer).toBeVisible({ timeout: 15000 })

    // Wait for Tiptap to initialize (adds [contenteditable] attribute)
    const editor = page.locator('[contenteditable="true"]')
    await expect(editor).toBeVisible({ timeout: 15000 })
    await editor.click()

    // Type @ to trigger mention autocomplete
    await editor.pressSequentially('The lord is @Strahd', { delay: 50 })

    // Wait for suggestion dropdown to appear
    const suggestions = page.locator('[data-testid="entity-suggestions"]')
    await expect(suggestions).toBeVisible({ timeout: 8000 })

    // Verify Strahd appears in suggestions
    await expect(suggestions.getByText('Strahd von Zarovich')).toBeVisible({ timeout: 3000 })

    // Click to select
    await suggestions.getByText('Strahd von Zarovich').click()

    // Verify entity mention was inserted in the editor
    await expect(editor.locator('.entity-mention')).toBeVisible({ timeout: 3000 })
  })
})
