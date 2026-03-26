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

  // --- 9.25: Full purchase flow (API-driven E2E) ---

  test('full purchase flow: grant wealth → stock shop → buy → verify inventory (9.25)', async ({ page }) => {
    await registerAndLogin(page, 'Buyer User')
    await createCampaign(page, `Purchase Flow ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const res = await page.evaluate(async (id) => {
      const cur = await fetch(`/api/campaigns/${id}/currencies`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Gold', symbol: 'gp', valueInBase: 100, sortOrder: 0 }),
      }).then(r => r.json())

      const item = await fetch(`/api/campaigns/${id}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Health Potion', rarity: 'common', stackable: true }),
      }).then(r => r.json())

      const shop = await fetch(`/api/campaigns/${id}/shops`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'E2E Shop' }),
      }).then(r => r.json())

      const shops = await fetch(`/api/campaigns/${id}/shops`).then(r => r.json())
      const shopSlug = shops.find((s: any) => s.id === shop.id)?.slug

      const stock = await fetch(`/api/campaigns/${id}/shops/${shopSlug}/stock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, quantity: 10, price: { gold: 1 } }),
      }).then(r => r.json())

      const inv = await fetch(`/api/campaigns/${id}/inventories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Buyer', ownerType: 'character', ownerId: 'e2e-buyer-1' }),
      }).then(r => r.json())

      await fetch(`/api/campaigns/${id}/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'grant', toOwnerId: 'e2e-buyer-1', toOwnerType: 'character', amounts: { [cur.id]: 100 } }),
      })

      const buyRes = await fetch(`/api/campaigns/${id}/shops/${shopSlug}/buy`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId: stock.id, buyerInventoryId: inv.id, buyerOwnerId: 'e2e-buyer-1', buyerOwnerType: 'character', quantity: 1, currencyId: cur.id, price: 0 }),
      }).then(r => r.json())

      const inventories = await fetch(`/api/campaigns/${id}/inventories?owner_id=e2e-buyer-1&owner_type=character`).then(r => r.json())
      const hasItem = inventories[0]?.items?.some((i: any) => i.itemId === item.id)

      return { buySuccess: buyRes.success, hasItem }
    }, campaignId)

    expect(res.buySuccess).toBe(true)
    expect(res.hasItem).toBe(true)
  })

  // --- 9.26: Currencies page ---

  test('currencies page: create currency and verify in list (9.26)', async ({ page }) => {
    await registerAndLogin(page, 'Currency Manager')
    await createCampaign(page, `Currency Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.goto(`/campaigns/${campaignId}/currencies`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1')).toContainText('Currencies', { timeout: 10000 })

    await page.click('[data-testid="new-currency-btn"]')
    await page.waitForSelector('[data-testid="currency-form"]')

    await page.fill('[data-testid="currency-name"]', 'Platinum')
    await page.fill('[data-testid="currency-symbol"]', 'pp')
    await page.fill('[data-testid="currency-value"]', '1000')

    await page.click('[data-testid="currency-save"]')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main >> text=Platinum')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=pp')).toBeVisible()
  })
})
