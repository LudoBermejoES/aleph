import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Session Decisions', () => {
  test('DM can create a decision with a consequence and reveal it', async ({ page }) => {
    await registerAndLogin(page, 'DM Tester')
    await createCampaign(page, `Dec Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a session via API
    const sessionRes = await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: 'Decision Test Session' },
    })
    const sessionSlug = sessionRes.slug

    // Navigate to session detail
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/sessions/${sessionSlug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1').first()).toContainText('Decision Test Session', { timeout: 10000 })

    // Click Add Decision
    await page.locator('button', { hasText: /add decision/i }).click()
    await page.fill('input[placeholder*="decided"]', 'The party chose the forest path')
    await page.locator('button', { hasText: /^Save$/ }).first().click()

    // Decision should appear
    await expect(page.locator('main').getByText('The party chose the forest path')).toBeVisible({ timeout: 5000 })

    // Add a consequence (hidden by default)
    await page.locator('button', { hasText: /add consequence/i }).click()
    await page.fill('input[placeholder*="result"]', 'They encounter a dragon later')
    // revealed checkbox unchecked by default — submit
    await page.locator('button', { hasText: /^Save$/ }).last().click()

    // DM sees hidden consequence with [Hidden] label
    await expect(page.locator('main').getByText(/hidden/i).first()).toBeVisible({ timeout: 5000 })

    // Reveal it
    await page.locator('button', { hasText: /reveal/i }).click()

    // Now consequence text is visible without hidden label
    await expect(page.locator('main').getByText('They encounter a dragon later')).toBeVisible({ timeout: 5000 })
  })
})
