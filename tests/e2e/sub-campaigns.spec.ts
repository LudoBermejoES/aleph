import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Sub-Campaigns', () => {
  test('create sub-campaign, assign session, verify tab', async ({ page }) => {
    await registerAndLogin(page, 'SG Tester')
    await createCampaign(page, `SG Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a sub-campaign via API
    await apiFetch(page, `/api/campaigns/${campaignId}/sub-campaigns`, {
      method: 'POST',
      body: { name: 'La Familia', description: 'Main sub-campaign' },
    })

    // Create a session in that sub-campaign via API
    await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: 'Sub-campaign Session One', subCampaignSlug: 'la-familia' },
    })

    // Navigate to sessions page
    await page.click('aside >> text=Sessions')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Sessions', { timeout: 10000 })

    // Sub-campaign tab should appear
    await expect(page.locator('main button', { hasText: 'La Familia' })).toBeVisible({
      timeout: 10000,
    })

    // Click the La Familia tab
    await page.locator('main button', { hasText: 'La Familia' }).click()
    await page.waitForLoadState('networkidle')

    // Session should appear under this tab
    await expect(page.locator('main >> text=Sub-campaign Session One')).toBeVisible({
      timeout: 10000,
    })
  })
})
