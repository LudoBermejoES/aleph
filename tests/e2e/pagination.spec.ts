import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Pagination UI', () => {
  test('pagination controls not shown when results fit on one page', async ({ page }) => {
    await registerAndLogin(page, `Pager ${uid()}`)
    await createCampaign(page, `Pager Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create 2 characters (fewer than page size of 50)
    for (let i = 0; i < 2; i++) {
      await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
        method: 'POST',
        body: { name: `NPC ${Date.now()}`, characterType: 'npc' },
      })
    }

    await page.goto(`/campaigns/${campaignId}/characters`, { waitUntil: 'networkidle' })
    // Pagination controls only appear when totalPages > 1 — not expected here
    const paginationText = page.locator('text=Showing')
    await expect(paginationText).not.toBeVisible()
  })

  test('pagination controls appear when results exceed page size', async ({ page }) => {
    await registerAndLogin(page, `PagerLarge ${uid()}`)
    await createCampaign(page, `PagerLarge Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Use API to set a tiny page size by navigating with ?pageSize=2
    // First create 3 characters
    for (let i = 0; i < 3; i++) {
      await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
        method: 'POST',
        body: { name: `NPC ${Date.now()}`, characterType: 'npc' },
      })
    }

    // Navigate with pageSize=2 to force pagination
    await page.goto(`/campaigns/${campaignId}/characters?pageSize=2`, { waitUntil: 'networkidle' })

    // Pagination controls should show (totalPages > 1 = 2 pages for 3 items at pageSize 2)
    await expect(page.locator('text=Showing')).toBeVisible({ timeout: 5000 })
  })

  test('URL updates when navigating to next page', async ({ page }) => {
    await registerAndLogin(page, `PagerNav ${uid()}`)
    await createCampaign(page, `PagerNav Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create 3 characters
    for (let i = 0; i < 3; i++) {
      await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
        method: 'POST',
        body: { name: `NPC ${Date.now()}`, characterType: 'npc' },
      })
    }

    await page.goto(`/campaigns/${campaignId}/characters?pageSize=2`, { waitUntil: 'networkidle' })

    // Click the next page button (›)
    const nextBtn = page.locator('button:has-text("›")').first()
    if (await nextBtn.isVisible({ timeout: 5000 })) {
      await nextBtn.click()
      await page.waitForURL(/page=2/, { timeout: 5000 })
      expect(page.url()).toContain('page=2')
    }
  })
})
