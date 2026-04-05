import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Arcs and Chapters', () => {
  test('arcs nav link is visible', async ({ page }) => {
    await registerAndLogin(page, 'Arcs DM')
    await createCampaign(page, `Arcs Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.goto(`/campaigns/${campaignId}/arcs`, { waitUntil: 'networkidle' })

    await expect(page.locator('main h1')).toBeVisible({ timeout: 10000 })
  })

  test('create arc and navigate to detail', async ({ page }) => {
    await registerAndLogin(page, 'Arc Creator DM')
    await createCampaign(page, `Arc Create Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create arc via API
    await apiFetch(page, `/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      body: { name: 'The Crimson Arc', status: 'active' },
    })

    await page.goto(`/campaigns/${campaignId}/arcs`, { waitUntil: 'networkidle' })

    // Arc should appear in list
    await expect(page.locator('main')).toContainText('The Crimson Arc', { timeout: 10000 })

    // Navigate to detail
    const arcLink = page.locator(`a:has-text("The Crimson Arc")`)
    await expect(arcLink).toBeVisible({ timeout: 5000 })
    await arcLink.click()

    await expect(page.locator('main h1')).toContainText('The Crimson Arc', { timeout: 10000 })
  })
})
