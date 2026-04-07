import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const BASE = 'http://localhost:3333'
const uid = () => Date.now().toString(36).slice(-4)

// 1×1 transparent PNG
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

test.describe('Campaign Export', () => {
  // Task 7.13: DM sees export button
  test('DM sees export button on campaign dashboard', async ({ page }) => {
    await registerAndLogin(page, `ExportDM ${uid()}`)
    await createCampaign(page, `Export Camp ${uid()}`)

    // Should already be on the campaign dashboard
    await page.waitForLoadState('networkidle')

    const exportBtn = page.locator('[data-testid="export-campaign-btn"]')
    await expect(exportBtn).toBeVisible({ timeout: 10000 })
  })

  // Task 7.14: Player does not see export button
  test('player does not see export button on campaign dashboard', async ({ page, context }) => {
    // DM creates campaign and invite
    await registerAndLogin(page, `ExportDM2 ${uid()}`)
    await createCampaign(page, `Player Export Camp ${uid()}`)

    // Generate invite via members page UI
    await page.click('aside >> text=Members')
    await page.waitForLoadState('networkidle')
    await page.click('main >> button:has-text("Invite")')
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.click('[role="dialog"] >> button:has-text("Generate")')
    await page.waitForTimeout(1500)
    const urlEl = page.locator('[role="dialog"] code')
    await expect(urlEl).toBeVisible({ timeout: 8000 })
    const joinUrl = ((await urlEl.textContent()) || '').trim()

    // Register player in new page
    const playerPage = await context.newPage()
    const playerEmail = `player-export-${Date.now()}@example.com`
    await playerPage.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' })
    await playerPage.waitForSelector('form', { timeout: 15000 })
    await playerPage.fill('#name', `ExportPlayer ${uid()}`)
    await playerPage.fill('#email', playerEmail)
    await playerPage.fill('#password', 'testpassword123')
    await playerPage.click('button[type="submit"]')
    await expect(async () => {
      expect(playerPage.url()).toContain(`${BASE}/`)
    }).toPass({ timeout: 20000 })
    await playerPage.waitForLoadState('networkidle')

    // Player joins via invite URL
    await playerPage.goto(joinUrl, { waitUntil: 'domcontentloaded' })
    await expect(async () => {
      expect(playerPage.url()).toMatch(/\/campaigns\/[^/]+$/)
    }).toPass({ timeout: 20000 })
    await playerPage.waitForLoadState('networkidle')

    // Export button should NOT be visible for player
    const exportBtn = playerPage.locator('[data-testid="export-campaign-btn"]')
    await expect(exportBtn).not.toBeVisible({ timeout: 5000 })
  })

  // Task 5.1: Export+import image round-trip — entity image is visible in new campaign
  test('exported entity image is visible after import round-trip', async ({ page }) => {
    await registerAndLogin(page, `ExportImgDM ${uid()}`)
    await createCampaign(page, `Img Round Trip ${uid()}`)
    await page.waitForLoadState('networkidle')

    // Get campaign ID from URL
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    expect(campaignId).toBeTruthy()

    // Create an entity via API
    const entity = await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Image Test Entity', type: 'location', visibility: 'members' },
    })
    expect(entity.slug).toBeTruthy()

    // Upload image to the entity via API (using page context for auth cookies)
    await page.evaluate(
      async ([campaignId, slug, b64]: [string, string, string]) => {
        const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
        const form = new FormData()
        form.append('image', new Blob([bytes], { type: 'image/png' }), 'test.png')
        const res = await fetch(`/api/campaigns/${campaignId}/entities/${slug}/image`, {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrf },
          body: form,
        })
        if (!res.ok) throw new Error(`Image upload failed: ${res.status}`)
      },
      [campaignId, entity.slug, TINY_PNG_B64] as [string, string, string],
    )

    // Export the campaign (download JSON)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('[data-testid="export-campaign-btn"]').click(),
    ])
    const exportPath = await download.path()
    expect(exportPath).toBeTruthy()

    // Read the export file and re-import via API
    const { readFileSync } = await import('fs')
    const exportData = JSON.parse(readFileSync(exportPath!, 'utf8'))

    expect(exportData.images).toBeDefined()
    const imageUrl = `/api/campaigns/${campaignId}/entities/${entity.slug}/image`
    expect(exportData.images[imageUrl]).toMatch(/^data:image\/png;base64,/)

    // Import via API using page context
    const imported = await apiFetch(page, '/api/campaigns/import', {
      method: 'POST',
      body: exportData,
    })
    expect(imported.id).toBeTruthy()
    const newCampaignId = imported.id

    // Navigate to the entity in the new campaign
    const entitiesData = await apiFetch(page, `/api/campaigns/${newCampaignId}/entities`)
    const importedEntity = entitiesData.entities?.find(
      (e: Record<string, unknown>) => e.name === 'Image Test Entity',
    )
    expect(importedEntity).toBeDefined()
    expect(importedEntity.imageUrl).toContain(newCampaignId)
    expect(importedEntity.imageUrl).not.toContain(campaignId)

    // Navigate to the entity page and check image is not broken
    await page.goto(`${BASE}/campaigns/${newCampaignId}/entities/${importedEntity.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // Find an img tag that references the new campaign's entity image
    const imgLocator = page.locator(`img[src*="${newCampaignId}"]`)
    await expect(imgLocator).toBeVisible({ timeout: 10000 })

    // Assert the image loaded (naturalWidth > 0 means no broken image)
    const naturalWidth = await imgLocator.evaluate((el: HTMLImageElement) => el.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)
  })

  // Task 7.15: Clicking export triggers download
  test('clicking export button triggers file download for DM', async ({ page }) => {
    await registerAndLogin(page, `ExportDL ${uid()}`)
    await createCampaign(page, `DL Export Camp ${uid()}`)
    await page.waitForLoadState('networkidle')

    // Wait for the download to start after clicking
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('[data-testid="export-campaign-btn"]').click(),
    ])

    expect(download.suggestedFilename()).toMatch(/campaign-.+-export-\d{4}-\d{2}-\d{2}\.json/)
  })
})
