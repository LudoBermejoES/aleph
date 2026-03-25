import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Entity Editing', () => {
  test('edit entity content and save', async ({ page }) => {
    await registerAndLogin(page, 'Editor')
    await createCampaign(page, `Edit Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const entityName = `Editable ${uid()}`
    await page.evaluate(async ([id, name]) => {
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'note', content: '# Original\n\nOriginal content.' }),
      })
    }, [campaignId, entityName])

    // Navigate to entity
    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')
    await page.click(`main >> text=${entityName}`)
    await page.waitForURL('**/entities/**', { timeout: 15000 })

    // Click Edit
    await page.click('main >> button:has-text("Edit")')
    await page.waitForTimeout(500)

    // Verify edit mode shows textarea
    const textarea = page.locator('main textarea')
    await expect(textarea).toBeVisible({ timeout: 5000 })

    // Change content
    await textarea.fill('# Updated\n\nNew content here.')
    await page.click('main >> button:has-text("Save")')
    await page.waitForTimeout(2000)

    // Verify content updated (after save, edit mode closes)
    await expect(page.locator('main >> text=New content here')).toBeVisible({ timeout: 10000 })
  })

  test('entity type filter on list page', async ({ page }) => {
    await registerAndLogin(page, 'Type Filter')
    await createCampaign(page, `Filter Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A Character', type: 'character', content: '# Char' }),
      })
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A Location', type: 'location', content: '# Location' }),
      })
    }, campaignId)

    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')

    // Both should be visible initially
    await expect(page.locator('main >> text=A Character')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=A Location')).toBeVisible()

    // Filter by character type
    await page.selectOption('main select', 'character')
    await page.waitForTimeout(1000)
    await expect(page.locator('main >> text=A Character')).toBeVisible()
  })
})
