import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Items & Shops', () => {
  test('navigate to items page', async ({ page }) => {
    await registerAndLogin(page, 'Item Viewer')
    await createCampaign(page, `Item Camp ${uid()}`)

    await page.click('aside >> text=Items')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Item Library', { timeout: 10000 })
  })

  test('create item via API and see in list', async ({ page }) => {
    await registerAndLogin(page, 'Item Creator')
    await createCampaign(page, `Item List ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Sunblade', rarity: 'legendary', description: 'A radiant weapon' }),
      })
    }, campaignId)

    await page.click('aside >> text=Items')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main >> text=Sunblade')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main span:has-text("legendary")')).toBeVisible()
  })

  test('navigate to shops page', async ({ page }) => {
    await registerAndLogin(page, 'Shop Viewer')
    await createCampaign(page, `Shop Camp ${uid()}`)

    await page.click('aside >> text=Shops')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Shops', { timeout: 10000 })
  })
})
