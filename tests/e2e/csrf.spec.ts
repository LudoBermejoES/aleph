import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('CSRF Protection', () => {
  test('normal form submissions from the app include CSRF token and succeed', async ({ page }) => {
    await registerAndLogin(page, `CSRFDM ${uid()}`)

    // Creating a campaign via the normal app flow should work (CSRF token sent automatically by the composable)
    const campaignName = `CSRF Test Camp ${uid()}`
    await createCampaign(page, campaignName)

    // If we got here without a 403, CSRF is working correctly
    expect(page.url()).toContain('/campaigns/')
  })

  test('CSRF cookie is set after login', async ({ page }) => {
    await registerAndLogin(page, `CSRFDM2 ${uid()}`)

    // After login and any authenticated API call, csrf_token cookie should be set
    await page.evaluate(() => fetch('/api/campaigns', { credentials: 'include' }))

    const cookies = await page.context().cookies()
    const csrfCookie = cookies.find((c) => c.name === 'csrf_token')
    expect(csrfCookie).toBeDefined()
    expect(csrfCookie?.value).toBeTruthy()
    expect(csrfCookie?.httpOnly).toBe(false) // Must be readable by JS
  })

  test('POST without CSRF token returns 403', async ({ page }) => {
    await registerAndLogin(page, `CSRFDM3 ${uid()}`)
    // Ensure CSRF cookie is set
    await page.evaluate(() => fetch('/api/campaigns', { credentials: 'include' }))
    await page.waitForTimeout(200)

    const result = await page.evaluate(async (name: string) => {
      const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      return { id: data.id ?? null }
    }, `CSRF No Token Camp ${uid()}`)
    expect(result.id).toBeTruthy()
    const campaignId = result.id

    // Delete the csrf_token cookie, then try a POST
    await page.context().clearCookies({ name: 'csrf_token' })

    const status = await page.evaluate(async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        // No X-CSRF-Token header
        body: JSON.stringify({ name: 'Test', type: 'lore' }),
      })
      return res.status
    }, campaignId)

    expect(status).toBe(403)
  })
})
