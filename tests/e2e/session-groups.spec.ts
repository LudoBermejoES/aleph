import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Session Groups', () => {
  test('create group, assign session, verify group tab', async ({ page }) => {
    await registerAndLogin(page, 'SG Tester')
    await createCampaign(page, `SG Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a session group via API
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/session-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'La Familia', description: 'Main group' }),
      })
    }, campaignId)

    // Create a session in that group via API
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Group Session One', groupSlug: 'la-familia' }),
      })
    }, campaignId)

    // Navigate to sessions page
    await page.click('aside >> text=Sessions')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Sessions', { timeout: 10000 })

    // Group tab should appear
    await expect(page.locator('main button', { hasText: 'La Familia' })).toBeVisible({ timeout: 10000 })

    // Click the La Familia tab
    await page.locator('main button', { hasText: 'La Familia' }).click()
    await page.waitForLoadState('networkidle')

    // Session should appear under this tab
    await expect(page.locator('main >> text=Group Session One')).toBeVisible({ timeout: 10000 })
  })
})
