import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Session Delete', () => {
  test('delete session from detail page redirects to sessions list', async ({ page }) => {
    await registerAndLogin(page, 'Delete Tester')
    await createCampaign(page, `Del Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a session via API
    await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: 'Session To Delete' },
    })

    // Navigate to sessions list
    await page.click('aside >> text=Sessions')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Sessions', { timeout: 10000 })

    // Click the session to open detail page
    await page.locator('main >> text=Session To Delete').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1').first()).toContainText('Session To Delete', {
      timeout: 10000,
    })

    // Register dialog handler before clicking (must be registered before the action that triggers it)
    page.once('dialog', (dialog) => dialog.accept())

    // Click delete button
    await page.locator('button', { hasText: /delete/i }).click()

    // Wait for redirect to sessions list
    await page.waitForURL(`**/campaigns/${campaignId}/sessions`, { timeout: 10000 })
    await expect(page.locator('main h1')).toContainText('Sessions', { timeout: 10000 })

    // Session should no longer appear in the list
    await expect(page.locator('main >> text=Session To Delete')).not.toBeVisible({ timeout: 5000 })
  })
})
