import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Campaign Members', () => {
  test('navigate to members page', async ({ page }) => {
    await registerAndLogin(page, 'Member Viewer')
    await createCampaign(page, `Member Camp ${uid()}`)

    await page.click('aside >> text=Members')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Members', { timeout: 10000 })
  })

  test('creator appears as DM in members list', async ({ page }) => {
    await registerAndLogin(page, 'DM Member')
    await createCampaign(page, `DM Camp ${uid()}`)

    await page.click('aside >> text=Members')
    await page.waitForLoadState('networkidle')

    // The campaign creator should be listed as DM
    await expect(page.locator('main >> text=dm').first()).toBeVisible({ timeout: 10000 })
  })

  test('invite button generates token', async ({ page }) => {
    await registerAndLogin(page, 'Inviter')
    await createCampaign(page, `Invite Camp ${uid()}`)

    await page.click('aside >> text=Members')
    await page.waitForLoadState('networkidle')

    await page.click('main >> button:has-text("Invite")')
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })

    // Click Generate Link
    await page.click('[role="dialog"] >> button:has-text("Generate")')
    await page.waitForTimeout(1000)

    // Token should appear
    await expect(page.locator('[role="dialog"] code')).toBeVisible({ timeout: 5000 })
  })
})
