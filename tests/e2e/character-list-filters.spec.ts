import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

async function setupChars(page: any, campaignId: string) {
  await page.evaluate(async (id: string) => {
    await fetch(`/api/campaigns/${id}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Aragorn', characterType: 'pc', race: 'Human', status: 'alive' }),
    })
    await fetch(`/api/campaigns/${id}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Boromir', characterType: 'pc', race: 'Human', status: 'dead' }),
    })
    await fetch(`/api/campaigns/${id}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Gandalf', characterType: 'npc', race: 'Maiar', status: 'alive' }),
    })
  }, campaignId)
}

test.describe('Character list filters (E2E)', () => {
  // 8.13: search input filters by name
  test('search input filters character list by name', async ({ page }) => {
    await registerAndLogin(page, `Search User ${uid()}`)
    await createCampaign(page, `Search Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await setupChars(page, campaignId)

    await page.goto(`${BASE}/campaigns/${campaignId}/characters`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main >> text=Aragorn')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Boromir')).toBeVisible({ timeout: 5000 })

    await page.fill('[data-testid="character-search"]', 'Ara')
    await page.waitForTimeout(400)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main >> text=Aragorn')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Boromir')).not.toBeVisible({ timeout: 5000 })
  })

  // 8.14: status filter shows only dead characters
  test('status filter shows only dead characters when "Dead" selected', async ({ page }) => {
    await registerAndLogin(page, `Status User ${uid()}`)
    await createCampaign(page, `Status Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await setupChars(page, campaignId)

    await page.goto(`${BASE}/campaigns/${campaignId}/characters`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.selectOption('[data-testid="status-filter"]', 'dead')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main >> text=Boromir')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Aragorn')).not.toBeVisible({ timeout: 5000 })
  })

  // 8.15: sort by name A→Z
  test('sort by name A→Z shows characters in alphabetical order', async ({ page }) => {
    await registerAndLogin(page, `Sort User ${uid()}`)
    await createCampaign(page, `Sort Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await setupChars(page, campaignId)

    await page.goto(`${BASE}/campaigns/${campaignId}/characters`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.selectOption('[data-testid="sort-field"]', 'name')
    await page.waitForLoadState('networkidle')

    const dirBtn = page.locator('[data-testid="sort-dir"]')
    const dirText = await dirBtn.textContent()
    if (dirText && dirText.includes('Z→A')) {
      await dirBtn.click()
      await page.waitForLoadState('networkidle')
    }

    const names = await page.locator('main a.block span.font-medium').allTextContents()
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })

  // 8.16: filter state persists in URL and survives page reload
  test('filter state persists in URL and survives page reload', async ({ page }) => {
    await registerAndLogin(page, `Persist User ${uid()}`)
    await createCampaign(page, `Persist Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await setupChars(page, campaignId)

    await page.goto(`${BASE}/campaigns/${campaignId}/characters`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.selectOption('[data-testid="status-filter"]', 'dead')
    await page.waitForLoadState('networkidle')
    await expect(async () => {
      expect(page.url()).toContain('status=dead')
    }).toPass({ timeout: 5000 })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    const statusValue = await page.locator('[data-testid="status-filter"]').inputValue()
    expect(statusValue).toBe('dead')
    await expect(page.locator('main >> text=Boromir')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Aragorn')).not.toBeVisible({ timeout: 5000 })
  })
})
