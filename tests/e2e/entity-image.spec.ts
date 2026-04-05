import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, BASE, apiFetch } from './helpers'

test.describe('Entity Image', () => {
  let campaignId: string

  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
    const path = await createCampaign(page, `Entity Image Test ${Date.now()}`)
    campaignId = path.split('/campaigns/')[1].replace(/\/$/, '')
  })

  test('entity detail page shows EntityImage placeholder for editor', async ({ page }) => {
    // Create an entity via API
    const res = await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Test Entity With Image', type: 'location' },
    })

    // Navigate to entity detail
    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${res.slug}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h1', { timeout: 15000 })

    // Wait for canEdit to resolve (needs campaign role fetch)
    // The EntityImage placeholder should be visible for the DM
    const imageContainer = page.locator('.relative.w-48.h-48')
    await expect(imageContainer).toBeVisible({ timeout: 15000 })
  })

  test('entity edit page shows EntityImage component', async ({ page }) => {
    const res = await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Edit Image Entity', type: 'faction' },
    })

    await page.goto(`${BASE}/campaigns/${campaignId}/entities/${res.slug}/edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h1', { timeout: 15000 })

    const imageContainer = page.locator('.relative.w-48')
    await expect(imageContainer).toBeVisible({ timeout: 10000 })
  })
})
