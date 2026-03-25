import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Navigation', () => {
  test('404 page shows for unknown route', async ({ page }) => {
    await registerAndLogin(page, 'Nav Tester')
    await page.goto(`${BASE}/some/nonexistent/path`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=404')).toBeVisible({ timeout: 10000 })
  })

  test('sidebar navigation between sections', async ({ page }) => {
    await registerAndLogin(page, 'Sidebar Nav')
    await createCampaign(page, `Nav Camp ${uid()}`)

    const sidebar = page.locator('aside')

    await sidebar.locator('a:has-text("Wiki")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Entities', { timeout: 10000 })

    await sidebar.locator('a:has-text("Characters")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Characters', { timeout: 10000 })

    await sidebar.locator('a:has-text("Sessions")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Sessions', { timeout: 10000 })

    await sidebar.locator('a:has-text("Maps")').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Maps', { timeout: 10000 })
  })

  test('All Campaigns returns to list', async ({ page }) => {
    await registerAndLogin(page, 'Back Nav')
    await createCampaign(page, `Back Camp ${uid()}`)

    await page.click('aside >> text=All Campaigns')
    await page.waitForURL(`${BASE}/`, { timeout: 15000 })
    await expect(page.locator('main h1')).toContainText('Campaigns', { timeout: 10000 })
  })
})
