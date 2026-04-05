import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Input Validation UI', () => {
  test('API rejects campaign with empty name and returns 422', async ({ page }) => {
    await registerAndLogin(page, `ValDM ${uid()}`)
    await page.evaluate(() => fetch('/api/campaigns'))
    await page.waitForTimeout(200)

    const status = await page.evaluate(async () => {
      const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name: '' }),
      })
      return res.status
    })

    expect(status).toBe(422)
  })

  test('API rejects entity with empty name and returns 422', async ({ page }) => {
    await registerAndLogin(page, `ValDM2 ${uid()}`)
    await createCampaign(page, `Val Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const status = await page.evaluate(async (id: string) => {
      const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
      const res = await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name: '', type: 'lore' }),
      })
      return res.status
    }, campaignId)

    expect(status).toBe(422)
  })

  test('API rejects campaign with name too long and returns 422', async ({ page }) => {
    await registerAndLogin(page, `ValDM3 ${uid()}`)
    // Trigger CSRF cookie
    await page.evaluate(() => fetch('/api/campaigns'))

    const status = await page.evaluate(async () => {
      const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name: 'x'.repeat(201) }),
      })
      return res.status
    })

    expect(status).toBe(422)
  })
})
