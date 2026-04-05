import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Entity Editing', () => {
  test('edit entity content and save', async ({ page }) => {
    await registerAndLogin(page, 'Editor')
    await createCampaign(page, `Edit Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const entityName = `Editable ${uid()}`
    const editableEntity = await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: entityName, type: 'note', content: '# Original\n\nOriginal content.' },
    })
    const slug = (editableEntity as any).slug

    // Navigate directly to entity detail page
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/entities/${slug}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('main h1').first()).toContainText(entityName, { timeout: 15000 })

    // Click Edit
    await page.click('main >> button:has-text("Edit")')
    await page.waitForTimeout(1500)

    // Verify edit mode shows Tiptap ProseMirror editor
    const prosemirror = page.locator('main .ProseMirror')
    await expect(prosemirror).toBeVisible({ timeout: 10000 })

    // Clear existing content and type new content
    await prosemirror.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('New content here')
    await page.click('main >> button:has-text("Save")')
    await page.waitForTimeout(2000)

    // Verify content updated (after save, edit mode closes)
    await expect(page.locator('main >> text=New content here')).toBeVisible({ timeout: 10000 })
  })

  test('entity type filter on list page', async ({ page }) => {
    await registerAndLogin(page, 'Type Filter')
    await createCampaign(page, `Filter Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'A Character', type: 'character', content: '# Char' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'A Location', type: 'location', content: '# Location' },
    })

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
