import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Campaign CRUD', () => {
  test('create campaign via dialog', async ({ page }) => {
    const name = `Campaign ${uid()}`
    await registerAndLogin(page, 'Campaign Creator')
    const path = await createCampaign(page, name)
    expect(path).toContain('/campaigns/')
    await expect(page.locator('main h1')).toContainText(name, { timeout: 10000 })
  })

  test('campaign dashboard shows feature links', async ({ page }) => {
    await registerAndLogin(page, 'Dashboard Viewer')
    await createCampaign(page, `Dashboard ${uid()}`)

    const main = page.locator('main')
    await expect(main.locator('text=Wiki').first()).toBeVisible({ timeout: 10000 })
    await expect(main.locator('text=Characters').first()).toBeVisible()
    await expect(main.locator('text=Maps').first()).toBeVisible()
    await expect(main.locator('text=Sessions').first()).toBeVisible()
  })

  // Note: sidebar links are inside collapsible groups. Visibility relies on groups being
  // expanded by default (no localStorage state in a fresh browser context).
  test('campaign sidebar shows navigation', async ({ page }) => {
    await registerAndLogin(page, 'Sidebar Viewer')
    await createCampaign(page, `Sidebar ${uid()}`)

    const sidebar = page.locator('aside')
    await expect(sidebar.locator('a:has-text("Wiki")')).toBeVisible({ timeout: 10000 })
    await expect(sidebar.locator('a:has-text("Characters")')).toBeVisible()
    await expect(sidebar.locator('a:has-text("Maps")')).toBeVisible()
    await expect(sidebar.locator('a:has-text("Sessions")')).toBeVisible()
    await expect(sidebar.locator('a:has-text("Members")')).toBeVisible()
  })

  test('campaigns list shows created campaign', async ({ page }) => {
    const name = `Listed ${uid()}`
    await registerAndLogin(page, 'List Viewer')
    await createCampaign(page, name)

    await page.click('aside >> text=All Campaigns')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`main >> text=${name}`)).toBeVisible({ timeout: 10000 })
  })
})
