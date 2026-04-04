import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Quest Detail Page', () => {
  test('navigate from quest list to quest detail', async ({ page }) => {
    await registerAndLogin(page, 'Quest DM')
    await createCampaign(page, `Quest Detail Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a quest via API
    const quest = await page.evaluate(async (id) => {
      const r = await fetch(`/api/campaigns/${id}/quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Find the Artifact', status: 'active', description: 'A dangerous quest' }),
      })
      return r.json()
    }, campaignId)

    // Navigate to quests list
    await page.goto(`/campaigns/${campaignId}/quests`, { waitUntil: 'networkidle' })

    // Quest name should be a link
    const questLink = page.locator(`a:has-text("Find the Artifact")`)
    await expect(questLink).toBeVisible({ timeout: 10000 })
    await questLink.click()

    // Should be on quest detail page
    await expect(page).toHaveURL(`/campaigns/${campaignId}/quests/${quest.slug}`, { timeout: 10000 })

    // Verify quest metadata
    await expect(page.locator('main h1')).toContainText('Find the Artifact', { timeout: 10000 })
    await expect(page.locator('main')).toContainText('active')
    await expect(page.locator('main')).toContainText('A dangerous quest')
  })

  test('quest detail page has edit link', async ({ page }) => {
    await registerAndLogin(page, 'Quest Edit DM')
    await createCampaign(page, `Quest Edit Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const quest = await page.evaluate(async (id) => {
      const r = await fetch(`/api/campaigns/${id}/quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Edit Test Quest', status: 'active' }),
      })
      return r.json()
    }, campaignId)

    await page.goto(`/campaigns/${campaignId}/quests/${quest.slug}`, { waitUntil: 'networkidle' })
    await expect(page.locator('main h1')).toContainText('Edit Test Quest', { timeout: 10000 })

    // Edit button should link to edit page
    const editLink = page.locator(`a[href*="/edit"]`)
    await expect(editLink).toBeVisible({ timeout: 5000 })
  })
})
