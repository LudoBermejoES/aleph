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
})
