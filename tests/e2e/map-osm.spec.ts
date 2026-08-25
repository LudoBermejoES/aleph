import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

/**
 * Nominatim's usage policy explicitly forbids automated/bulk querying (design.md D3), so
 * this suite never lets a real request reach it: the server-side geocode endpoint is
 * stubbed at the browser network layer for every test here.
 */
async function stubGeocode(
  page: import('@playwright/test').Page,
  candidates: { displayName: string; lat: number; lng: number }[],
) {
  await page.route('**/api/campaigns/*/maps/geocode', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ candidates }),
    })
  })
}

test.describe('OSM maps (task 3.4)', () => {
  test('creating an osm map by city shows the geocoded result before saving', async ({ page }) => {
    await registerAndLogin(page, 'OSM Map Creator')
    await createCampaign(page, `OSM Camp ${uid()}`)

    await stubGeocode(page, [{ displayName: 'Berlin, Germany', lat: 52.52, lng: 13.405 }])

    await page.click('aside >> text=Maps')
    await page.waitForLoadState('networkidle')
    await page.click('text=New Map')
    await page.waitForSelector('[data-testid="map-type-select"]', { timeout: 10000 })

    await page.fill('input[placeholder*="Barovia"]', `Berlin Map ${uid()}`)
    await page.selectOption('[data-testid="map-type-select"]', 'osm')
    await page.fill('[data-testid="map-address-input"]', 'Berlin')
    await page.click('[data-testid="map-address-search-btn"]')

    // The resolved name + coordinates must be shown BEFORE the map is saved (design.md D7).
    await expect(page.locator('[data-testid="map-geocode-results"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="map-geocode-results"]')).toContainText(
      'Berlin, Germany',
    )

    await page.click('[data-testid="map-geocode-results"] button')
    await expect(page.locator('[data-testid="map-selected-location"]')).toContainText('52.52')

    await page.click('button[type="submit"]')
    await page.waitForURL('**/maps/**', { timeout: 15000 })
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 })
  })

  test('creating an osm map with direct coordinates never calls the geocoder', async ({ page }) => {
    await registerAndLogin(page, 'OSM Direct Creator')
    await createCampaign(page, `OSM Direct Camp ${uid()}`)

    let geocodeCalled = false
    await page.route('**/api/campaigns/*/maps/geocode', async (route) => {
      geocodeCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"candidates":[]}',
      })
    })

    await page.click('aside >> text=Maps')
    await page.waitForLoadState('networkidle')
    await page.click('text=New Map')
    await page.waitForSelector('[data-testid="map-type-select"]', { timeout: 10000 })

    await page.fill('input[placeholder*="Barovia"]', `Direct Coords Map ${uid()}`)
    await page.selectOption('[data-testid="map-type-select"]', 'osm')
    await page.click('text=Or enter coordinates directly')
    await page.fill('[data-testid="map-center-lat-input"]', '48.8566')
    await page.fill('[data-testid="map-center-lng-input"]', '2.3522')

    await page.click('button[type="submit"]')
    await page.waitForURL('**/maps/**', { timeout: 15000 })

    expect(geocodeCalled).toBe(false)
  })
})
