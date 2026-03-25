import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Map Pins', () => {
  test('create map with pins and see them on detail page', async ({ page }) => {
    await registerAndLogin(page, 'Pin Creator')
    await createCampaign(page, `Pin Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create map via API
    const mapRes = await page.evaluate(async (id) => {
      const r = await fetch(`/api/campaigns/${id}/maps`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pin Test Map' }),
      })
      return r.json()
    }, campaignId)

    const mapSlug = (mapRes as any).slug

    // Add pins via API
    await page.evaluate(async ([id, slug]) => {
      await fetch(`/api/campaigns/${id}/maps/${slug}/pins`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Castle Ravenloft', lat: 100, lng: 200, color: '#ff0000' }),
      })
      await fetch(`/api/campaigns/${id}/maps/${slug}/pins`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Village of Barovia', lat: 300, lng: 150, color: '#00ff00' }),
      })
    }, [campaignId, mapSlug])

    // Navigate to map detail
    await page.click('aside >> text=Maps')
    await page.waitForLoadState('networkidle')
    await page.click('main >> text=Pin Test Map')
    await page.waitForURL('**/maps/**', { timeout: 15000 })

    // Verify pins are listed
    await expect(page.locator('main >> text=Castle Ravenloft')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Village of Barovia')).toBeVisible()
  })

  test('create map with layers and see them listed', async ({ page }) => {
    await registerAndLogin(page, 'Layer Creator')
    await createCampaign(page, `Layer Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const mapRes = await page.evaluate(async (id) => {
      const r = await fetch(`/api/campaigns/${id}/maps`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Layer Test Map' }),
      })
      return r.json()
    }, campaignId)

    await page.evaluate(async ([id, slug]) => {
      await fetch(`/api/campaigns/${id}/maps/${slug}/layers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Political Borders', type: 'overlay', opacity: 0.5 }),
      })
    }, [campaignId, (mapRes as any).slug])

    await page.click('aside >> text=Maps')
    await page.waitForLoadState('networkidle')
    await page.click('main >> text=Layer Test Map')
    await page.waitForURL('**/maps/**', { timeout: 15000 })

    await expect(page.locator('main span:has-text("Political Borders")')).toBeVisible({ timeout: 10000 })
  })
})
