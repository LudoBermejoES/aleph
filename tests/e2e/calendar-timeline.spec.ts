import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Calendar & Timeline E2E', () => {
  test('calendars page shows calendar list (9.14)', async ({ page }) => {
    await registerAndLogin(page, 'CalE2E')
    await createCampaign(page, `CalCamp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create calendar via API
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/calendars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Harptos Calendar',
          configJson: JSON.stringify({
            months: [
              { name: 'Hammer', days: 30 }, { name: 'Alturiak', days: 30 },
              { name: 'Ches', days: 30 }, { name: 'Tarsakh', days: 30 },
            ],
            yearLength: 120,
          }),
          currentYear: 1492, currentMonth: 1, currentDay: 1,
        }),
      })
    }, campaignId)

    // Navigate to calendars
    await page.click('aside >> text=Calendars')
    await expect(async () => {
      expect(page.url()).toContain('/calendars')
    }).toPass({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main').getByText('Harptos Calendar')).toBeVisible({ timeout: 5000 })
  })

  test('calendar detail shows month grid (9.15)', async ({ page }) => {
    await registerAndLogin(page, 'CalDetail')
    await createCampaign(page, `CalGrid ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create calendar + event via API
    const calRes = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/calendars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Grid Calendar',
          configJson: JSON.stringify({
            months: [{ name: 'Hammer', days: 30 }, { name: 'Alturiak', days: 30 }],
            yearLength: 60,
          }),
          currentYear: 1492, currentMonth: 1, currentDay: 15,
        }),
      })
      return res.json()
    }, campaignId) as any

    await page.evaluate(async ([id, calId]) => {
      await fetch(`/api/campaigns/${id}/calendars/${calId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Midwinter Feast', date: { year: 1492, month: 1, day: 15 } }),
      })
    }, [campaignId, calRes.id])

    // Navigate to calendar detail
    await page.goto(`${BASE}/campaigns/${campaignId}/calendars/${calRes.id}`)
    await page.waitForLoadState('networkidle')

    // Verify grid and event
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="month-nav"]')).toContainText('Hammer')
    await expect(page.locator('main')).toContainText('Midwinter Feast')
  })

  test('timeline detail shows chronicle view (9.17)', async ({ page }) => {
    await registerAndLogin(page, 'TLDetail')
    await createCampaign(page, `TLCamp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create timeline + event via API
    const tlRes = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/timelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Campaign Arc 1' }),
      })
      return res.json()
    }, campaignId) as any

    await page.evaluate(async ([id, slug]) => {
      await fetch(`/api/campaigns/${id}/timelines/${slug}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Arrival in Barovia', date: { year: 1492, month: 3, day: 1 }, description: 'The party crossed the mists.' }),
      })
    }, [campaignId, tlRes.slug])

    // Navigate to timeline
    await page.goto(`${BASE}/campaigns/${campaignId}/timelines/${tlRes.slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="chronicle-view"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main')).toContainText('Arrival in Barovia')
    await expect(page.locator('main')).toContainText('The party crossed the mists')
  })

  test('add timeline event via UI form', async ({ page }) => {
    await registerAndLogin(page, 'TLAddEv')
    await createCampaign(page, `TLAdd ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create timeline via API
    const tlRes = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/timelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Timeline' }),
      })
      return res.json()
    }, campaignId) as any

    // Navigate to timeline detail
    await page.goto(`${BASE}/campaigns/${campaignId}/timelines/${tlRes.slug}`)
    await page.waitForLoadState('networkidle')

    // Form is hidden initially
    await expect(page.locator('[data-testid="add-event-form"]')).toBeHidden()

    // Open the form
    await page.click('[data-testid="add-event-btn"]')
    await expect(page.locator('[data-testid="add-event-form"]')).toBeVisible()

    // Fill in event details
    await page.locator('[data-testid="add-event-form"] input[placeholder*="Event Name"], [data-testid="add-event-form"] input[placeholder*="Battle"]').fill('Fall of Strahd')
    await page.locator('[data-testid="add-event-form"] input[placeholder*="description"]').fill('The vampire was finally defeated.')
    const numInputs = page.locator('[data-testid="add-event-form"] input[type="number"]')
    await numInputs.nth(0).fill('1492') // year
    await numInputs.nth(1).fill('3')    // month
    await numInputs.nth(2).fill('15')   // day

    // Submit
    await page.locator('[data-testid="add-event-form"] button[type="submit"]').click()

    // Form closes and event appears in chronicle
    await expect(page.locator('[data-testid="add-event-form"]')).toBeHidden({ timeout: 5000 })
    await expect(page.locator('[data-testid="chronicle-view"]')).toContainText('Fall of Strahd', { timeout: 5000 })
    await expect(page.locator('[data-testid="chronicle-view"]')).toContainText('The vampire was finally defeated.')
  })

  test('advance campaign date via UI (9.16)', async ({ page }) => {
    await registerAndLogin(page, 'AdvDate')
    await createCampaign(page, `AdvCamp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create calendar via API
    const calRes = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/calendars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Advance Test Cal',
          configJson: JSON.stringify({
            months: [{ name: 'Hammer', days: 30 }, { name: 'Alturiak', days: 30 }],
            yearLength: 60,
          }),
          currentYear: 1492, currentMonth: 1, currentDay: 1,
        }),
      })
      return res.json()
    }, campaignId) as any

    // Navigate to calendar detail
    await page.goto(`${BASE}/campaigns/${campaignId}/calendars/${calRes.id}`)
    await page.waitForLoadState('networkidle')

    // Initial date shown
    await expect(page.locator('main')).toContainText('Year 1492', { timeout: 10000 })

    // Open advance panel and advance by 5 days
    await page.click('[data-testid="advance-date"]')
    await expect(page.locator('[data-testid="advance-panel"]')).toBeVisible()
    await page.locator('[data-testid="advance-panel"] input[type="number"]').fill('5')
    await page.locator('[data-testid="advance-panel"] button', { hasText: 'Advance' }).click()

    // Panel should close and date should reflect Day 6
    await expect(page.locator('[data-testid="advance-panel"]')).toBeHidden({ timeout: 5000 })
    await expect(page.locator('main')).toContainText('6', { timeout: 5000 })
  })
})
