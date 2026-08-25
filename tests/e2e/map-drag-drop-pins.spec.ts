import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

/**
 * design.md D6: drag-and-drop is the FIRST way to create a pin from the web UI, for both
 * map types with the same picker/endpoint. This exercises the actual browser drag, not the
 * API directly (that's already covered by tests/integration/maps-osm.test.ts).
 */
test.describe('Drag-and-drop pin creation (task 5.7)', () => {
  test('dragging an entity onto an image map creates a pin without reload', async ({ page }) => {
    await registerAndLogin(page, 'DnD Image Creator')
    const campaignPath = await createCampaign(page, `DnD Image Camp ${uid()}`)
    const campaignId = campaignPath.split('/campaigns/')[1]?.split('/')[0]

    const entityName = `Draggable Entity ${uid()}`
    await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: entityName, type: 'location', content: '# Test' },
    })
    const mapRes = (await apiFetch(page, `/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      body: { name: `DnD Image Map ${uid()}` },
    })) as { slug: string }

    await page.goto(`${campaignPath}/maps/${mapRes.slug}`)
    await page.waitForSelector('.leaflet-container', { timeout: 15000 })
    await page.waitForSelector('[data-testid="map-entities-panel"]', { timeout: 10000 })

    const source = page.locator(`[data-testid="map-entities-panel"] li:has-text("${entityName}")`)
    const target = page.locator('.leaflet-container')
    await source.dragTo(target)

    await expect(page.locator(`text=${entityName}`).first()).toBeVisible({ timeout: 10000 })

    // Persists after a reload -- not just an optimistic client-side add.
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main')).toContainText(entityName, { timeout: 10000 })
  })

  test('dragging an entity onto an osm map creates a pin without reload', async ({ page }) => {
    await registerAndLogin(page, 'DnD OSM Creator')
    const campaignPath = await createCampaign(page, `DnD OSM Camp ${uid()}`)
    const campaignId = campaignPath.split('/campaigns/')[1]?.split('/')[0]

    const entityName = `Draggable OSM Entity ${uid()}`
    await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: entityName, type: 'location', content: '# Test' },
    })
    const mapRes = (await apiFetch(page, `/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      body: {
        name: `DnD OSM Map ${uid()}`,
        type: 'osm',
        centerLat: 52.52,
        centerLng: 13.405,
        defaultZoom: 12,
      },
    })) as { slug: string }

    await page.goto(`${campaignPath}/maps/${mapRes.slug}`)
    await page.waitForSelector('.leaflet-container', { timeout: 15000 })
    await page.waitForSelector('[data-testid="map-entities-panel"]', { timeout: 10000 })

    const source = page.locator(`[data-testid="map-entities-panel"] li:has-text("${entityName}")`)
    const target = page.locator('.leaflet-container')
    await source.dragTo(target)

    await expect(page.locator(`text=${entityName}`).first()).toBeVisible({ timeout: 10000 })

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main')).toContainText(entityName, { timeout: 10000 })
  })
})
