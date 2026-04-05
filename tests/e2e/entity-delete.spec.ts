import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Entity Deletion', () => {
  test('delete entity removes it from list', async ({ page }) => {
    await registerAndLogin(page, 'Deleter')
    await createCampaign(page, `Delete Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const entityName = `ToDelete ${uid()}`
    const createRes = await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: entityName, type: 'note', content: '# Delete me' },
    })

    // Verify it exists in the list
    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`main >> text=${entityName}`)).toBeVisible({ timeout: 10000 })

    // Delete via API (DM has permission)
    await apiFetch(page, `/api/campaigns/${campaignId}/entities/${(createRes as any).slug}`, {
      method: 'DELETE',
    })

    // Refresh and verify gone
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`main >> text=${entityName}`)).not.toBeVisible({ timeout: 5000 })
  })
})
