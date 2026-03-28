import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, BASE } from './helpers'

test.describe('Entity Image', () => {
  let campaignId: string

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
    const path = await createCampaign(page, `Entity Image Test ${Date.now()}`)
    campaignId = path.split('/campaigns/')[1].replace(/\/$/, '')
  })

  test('entity detail page shows EntityImage placeholder for editor', async ({ page }) => {
    // Create an entity via API
    const res = await page.evaluate(async ({ base, campaignId }) => {
      const r = await fetch(`${base}/api/campaigns/${campaignId}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Entity With Image', type: 'location' }),
      })
      return r.json()
    }, { base: BASE, campaignId })

    // Navigate to entity detail
    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${res.slug}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h1', { timeout: 15000 })

    // Wait for canEdit to resolve (needs campaign role fetch)
    // The EntityImage placeholder should be visible for the DM
    const imageContainer = page.locator('.relative.w-48.h-48')
    await expect(imageContainer).toBeVisible({ timeout: 15000 })
  })

  test('entity edit page shows EntityImage component', async ({ page }) => {
    const res = await page.evaluate(async ({ base, campaignId }) => {
      const r = await fetch(`${base}/api/campaigns/${campaignId}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Edit Image Entity', type: 'faction' }),
      })
      return r.json()
    }, { base: BASE, campaignId })

    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${res.slug}/edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h1', { timeout: 15000 })

    const imageContainer = page.locator('.relative.w-48')
    await expect(imageContainer).toBeVisible({ timeout: 10000 })
  })
})
