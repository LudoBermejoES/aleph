import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Entity Deletion', () => {
  test('delete entity removes it from list', async ({ page }) => {
    await registerAndLogin(page, 'Deleter')
    await createCampaign(page, `Delete Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const entityName = `ToDelete ${uid()}`
    const createRes = await page.evaluate(async ([id, name]) => {
      const r = await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'note', content: '# Delete me' }),
      })
      return r.json()
    }, [campaignId, entityName])

    // Verify it exists in the list
    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`main >> text=${entityName}`)).toBeVisible({ timeout: 10000 })

    // Delete via API (DM has permission)
    await page.evaluate(async ([id, slug]) => {
      await fetch(`/api/campaigns/${id}/entities/${slug}`, { method: 'DELETE' })
    }, [campaignId, (createRes as any).slug])

    // Refresh and verify gone
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`main >> text=${entityName}`)).not.toBeVisible({ timeout: 5000 })
  })
})
