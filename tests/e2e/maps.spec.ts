import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Maps', () => {
  test('navigate to maps page', async ({ page }) => {
    await registerAndLogin(page, 'Map Viewer')
    await createCampaign(page, `Map Camp ${uid()}`)

    await page.click('aside >> text=Maps')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Maps', { timeout: 10000 })
  })

  test('create map and view detail', async ({ page }) => {
    await registerAndLogin(page, 'Map Creator')
    await createCampaign(page, `Map Detail ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'World Map' }),
      })
    }, campaignId)

    await page.click('aside >> text=Maps')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main >> text=World Map')).toBeVisible({ timeout: 10000 })

    await page.click('main >> text=World Map')
    await page.waitForURL('**/maps/**', { timeout: 15000 })
    await expect(page.locator('main h1')).toContainText('World Map', { timeout: 10000 })
  })

  test('map view renders Leaflet container', async ({ page }) => {
    await registerAndLogin(page, 'Map Leaflet')
    await createCampaign(page, `Map Leaflet ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Leaflet Map' }),
      })
    }, campaignId)

    await page.click('aside >> text=Maps')
    await page.waitForLoadState('networkidle')
    await page.click('main >> text=Leaflet Map')
    await page.waitForURL('**/maps/**', { timeout: 15000 })

    // Leaflet container should be present in the DOM
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 })
  })
})
