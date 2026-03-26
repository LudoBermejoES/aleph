import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Create Pages E2E', () => {
  test('create character via full page form (9.22 / 10.23)', async ({ page }) => {
    await registerAndLogin(page, 'CharPage')
    await createCampaign(page, `CharPage ${uid()}`)

    await page.click('aside >> text=Characters')
    await expect(async () => { expect(page.url()).toContain('/characters') }).toPass({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click New Character → navigates to /characters/new
    await page.click('[data-testid="new-character-btn"]')
    await expect(async () => { expect(page.url()).toContain('/characters/new') }).toPass({ timeout: 10000 })

    // Fill full-page form
    await page.fill('input[placeholder="Character name"]', `TestChar ${uid()}`)
    await page.selectOption('select:has(option[value="npc"])', 'npc')

    // Submit
    await page.click('button[type="submit"]:has-text("Create")')

    // Should navigate to character detail
    await expect(async () => {
      expect(page.url()).toMatch(/\/characters\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })
    await expect(page.locator('main h1')).toContainText('TestChar', { timeout: 10000 })
  })

  test('create calendar via full page form (9.23 / 10.25)', async ({ page }) => {
    await registerAndLogin(page, 'CalPage')
    await createCampaign(page, `CalPage ${uid()}`)

    await page.click('aside >> text=Calendars')
    await expect(async () => { expect(page.url()).toContain('/calendars') }).toPass({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click New Calendar → navigates to /calendars/new
    await page.click('[data-testid="new-calendar-btn"]')
    await expect(async () => { expect(page.url()).toContain('/calendars/new') }).toPass({ timeout: 10000 })

    // Fill form
    await page.fill('input[placeholder="Harptos Calendar"]', `TestCal ${uid()}`)
    await page.fill('input[placeholder="Month name"]', 'Hammer')

    // Submit
    await page.click('button[type="submit"]:has-text("Create")')

    // Should navigate to calendar detail with grid
    await expect(async () => {
      expect(page.url()).toMatch(/\/calendars\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible({ timeout: 10000 })
  })

  test('create timeline via full page form (9.24)', async ({ page }) => {
    await registerAndLogin(page, 'TlPage')
    await createCampaign(page, `TlPage ${uid()}`)

    await page.click('aside >> text=Calendars')
    await expect(async () => { expect(page.url()).toContain('/calendars') }).toPass({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click New Timeline → navigates to /timelines/new
    await page.click('[data-testid="new-timeline-btn"]')
    await expect(async () => { expect(page.url()).toContain('/timelines/new') }).toPass({ timeout: 10000 })

    // Fill form
    await page.fill('input[placeholder="Campaign Arc 1"]', `TestTimeline ${uid()}`)

    // Submit
    await page.click('button[type="submit"]:has-text("Create")')

    // Should navigate to timeline detail
    await expect(async () => {
      expect(page.url()).toMatch(/\/timelines\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })
    await expect(page.locator('[data-testid="chronicle-view"]')).toBeVisible({ timeout: 10000 })
  })
})
