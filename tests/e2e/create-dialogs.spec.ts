import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Create Dialogs E2E', () => {
  test('create character via dialog (9.22)', async ({ page }) => {
    await registerAndLogin(page, 'CharDlg')
    await createCampaign(page, `CharDlg ${uid()}`)

    await page.click('aside >> text=Characters')
    await expect(async () => { expect(page.url()).toContain('/characters') }).toPass({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Open dialog
    await page.click('[data-testid="new-character-btn"]')
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

    // Fill form
    await page.fill('[role="dialog"] input[placeholder*="Strahd"]', `TestChar ${uid()}`)
    await page.selectOption('[role="dialog"] select:first-of-type', 'npc')

    // Submit
    await page.evaluate(() => {
      const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
      if (form) form.requestSubmit()
    })

    // Should navigate to character detail
    await expect(async () => {
      expect(page.url()).toContain('/characters/')
    }).toPass({ timeout: 15000 })
    await expect(page.locator('main h1')).toContainText('TestChar', { timeout: 10000 })
  })

  test('create calendar via dialog (9.23)', async ({ page }) => {
    await registerAndLogin(page, 'CalDlg')
    await createCampaign(page, `CalDlg ${uid()}`)

    await page.click('aside >> text=Calendars')
    await expect(async () => { expect(page.url()).toContain('/calendars') }).toPass({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Open dialog
    await page.click('[data-testid="new-calendar-btn"]')
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

    // Fill form
    await page.fill('[role="dialog"] input[placeholder*="Harptos"]', `TestCal ${uid()}`)

    // Fill first month name
    await page.fill('[role="dialog"] input[placeholder="Month name"]', 'Hammer')

    // Submit
    await page.evaluate(() => {
      const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
      if (form) form.requestSubmit()
    })

    // Should navigate to calendar detail with grid
    await expect(async () => {
      expect(page.url()).toContain('/calendars/')
    }).toPass({ timeout: 15000 })
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible({ timeout: 10000 })
  })

  test('create timeline via dialog (9.24)', async ({ page }) => {
    await registerAndLogin(page, 'TlDlg')
    await createCampaign(page, `TlDlg ${uid()}`)

    await page.click('aside >> text=Calendars')
    await expect(async () => { expect(page.url()).toContain('/calendars') }).toPass({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Open timeline dialog
    await page.click('[data-testid="new-timeline-btn"]')
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })

    // Fill form
    await page.fill('[role="dialog"] input[placeholder*="Campaign Arc"]', `TestTimeline ${uid()}`)

    // Submit
    await page.evaluate(() => {
      const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
      if (form) form.requestSubmit()
    })

    // Should navigate to timeline detail
    await expect(async () => {
      expect(page.url()).toContain('/timelines/')
    }).toPass({ timeout: 15000 })
    await expect(page.locator('[data-testid="chronicle-view"]')).toBeVisible({ timeout: 10000 })
  })
})
