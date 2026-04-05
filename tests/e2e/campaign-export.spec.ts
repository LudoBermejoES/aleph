import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const BASE = 'http://localhost:3333'
const uid = () => Date.now().toString(36).slice(-4)

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

    // Get invite token via API from DM's session cookie
    const campaignUrl = page.url()
    const campaignId = campaignUrl.split('/campaigns/')[1]?.split('/')[0]

    // Generate invite via members page UI
    await page.click('aside >> text=Members')
    await page.waitForLoadState('networkidle')
    await page.click('main >> button:has-text("Invite")')
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.click('[role="dialog"] >> button:has-text("Generate")')
    await page.waitForTimeout(1500)
    const urlEl = page.locator('[role="dialog"] code')
    await expect(urlEl).toBeVisible({ timeout: 8000 })
    const joinUrl = (await urlEl.textContent() || '').trim()

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
