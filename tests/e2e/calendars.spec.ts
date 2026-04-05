import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Calendars & Timelines', () => {
  test('navigate to calendars page', async ({ page }) => {
    await registerAndLogin(page, 'Cal Viewer')
    await createCampaign(page, `Cal Camp ${uid()}`)

    await page.click('aside >> text=Calendars')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Calendars', { timeout: 10000 })
  })

  test('create calendar via API and see in list', async ({ page }) => {
    await registerAndLogin(page, 'Cal Creator')
    await createCampaign(page, `Cal List ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      body: {
        name: 'Harptos Calendar',
        months: [{ name: 'Hammer', days: 30 }, { name: 'Alturiak', days: 30 }],
        yearLength: 60,
        currentDate: { year: 1492, month: 1, day: 1 },
      },
    })

    await page.click('aside >> text=Calendars')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main >> text=Harptos Calendar')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Year 1492')).toBeVisible()
  })
})
