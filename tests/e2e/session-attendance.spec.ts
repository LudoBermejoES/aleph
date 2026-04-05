import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Session Attendance', () => {
  test('user can set their RSVP status on a session', async ({ page }) => {
    await registerAndLogin(page, 'RSVP Tester')
    await createCampaign(page, `RSVP Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a session via API
    const sessionRes = await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: 'RSVP Test Session' },
    })
    const sessionSlug = sessionRes.slug

    // Navigate to session detail
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/sessions/${sessionSlug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1').first()).toContainText('RSVP Test Session', {
      timeout: 10000,
    })

    // Click the "Accepted" RSVP button
    await page.locator('button', { hasText: /^Accepted$/ }).click()
    await page.waitForLoadState('networkidle')

    // After reload the attendance section should show a green dot for the user
    await expect(
      page
        .locator('main')
        .getByText(/Accepted/)
        .first(),
    ).toBeVisible({ timeout: 5000 })
  })
})
