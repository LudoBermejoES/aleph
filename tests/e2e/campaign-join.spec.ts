import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const BASE = 'http://localhost:3333'
const uid = () => Date.now().toString(36).slice(-4)

/**
 * Generate an invite link via the members page UI.
 * Returns the full join URL shown in the dialog.
 */
async function generateInviteUrl(page: import('@playwright/test').Page): Promise<string> {
  await page.click('aside >> text=Members')
  await page.waitForLoadState('networkidle')

  await page.click('main >> button:has-text("Invite")')
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 })

  await page.click('[role="dialog"] >> button:has-text("Generate")')
  await page.waitForTimeout(1500)

  // Wait for the join URL to appear (contains /join?token=)
  const urlEl = page.locator('[role="dialog"] code')
  await expect(urlEl).toBeVisible({ timeout: 8000 })
  const url = await urlEl.textContent()
  if (!url || !url.includes('/join?token=')) {
    throw new Error(`Expected join URL but got: ${url}`)
  }
  return url.trim()
}

test.describe('Campaign Join Flow', () => {
  test('unauthenticated user can register on join page and is redirected to campaign', async ({ page, context }) => {
    // DM creates a campaign and generates an invite
    await registerAndLogin(page, `DM ${uid()}`)
    await createCampaign(page, `Join Camp ${uid()}`)
    const joinUrl = await generateInviteUrl(page)

    // Open a new incognito-like page (same context but navigate without session)
    const playerPage = await context.newPage()

    // Clear cookies so the player is unauthenticated
    await context.clearCookies()

    await playerPage.goto(joinUrl, { waitUntil: 'domcontentloaded' })
    await playerPage.waitForLoadState('networkidle')

    // Should see register tab
    await expect(playerPage.locator('text=Register')).toBeVisible({ timeout: 10000 })

    // Switch to Register tab and fill in the form
    await playerPage.click('button:has-text("Register")')

    const playerName = `Player ${uid()}`
    const playerEmail = `player-${Date.now()}@example.com`
    await playerPage.fill('#reg-name', playerName)
    await playerPage.fill('#reg-email', playerEmail)
    await playerPage.fill('#reg-password', 'testpassword123')
    await playerPage.click('button[type="submit"]')

    // Should redirect to the campaign page
    await expect(async () => {
      expect(playerPage.url()).toMatch(/\/campaigns\/[^/]+$/)
    }).toPass({ timeout: 20000 })
  })

  test('authenticated user visiting invite URL is auto-joined and redirected', async ({ page, context }) => {
    // DM creates campaign and invite
    await registerAndLogin(page, `DM2 ${uid()}`)
    await createCampaign(page, `AutoJoin Camp ${uid()}`)
    const joinUrl = await generateInviteUrl(page)

    // Register player in a new tab (same context — shares cookies)
    const playerPage = await context.newPage()
    const playerEmail = `autojoin-${Date.now()}@example.com`
    await playerPage.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' })
    await playerPage.waitForSelector('form', { timeout: 15000 })
    await playerPage.fill('#name', `AutoPlayer ${uid()}`)
    await playerPage.fill('#email', playerEmail)
    await playerPage.fill('#password', 'testpassword123')
    await playerPage.click('button[type="submit"]')
    await expect(async () => {
      expect(playerPage.url()).toContain(`${BASE}/`)
    }).toPass({ timeout: 20000 })
    await playerPage.waitForLoadState('networkidle')

    // Authenticated player visits the invite URL — should auto-join
    await playerPage.goto(joinUrl, { waitUntil: 'domcontentloaded' })

    // Should redirect directly to the campaign (no login form shown)
    await expect(async () => {
      expect(playerPage.url()).toMatch(/\/campaigns\/[^/]+$/)
    }).toPass({ timeout: 20000 })
  })
})
