import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Quests', () => {
  test('create quest and see in list', async ({ page }) => {
    await registerAndLogin(page, 'Quest Creator')
    await createCampaign(page, `Quest Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Find the Lost Sword', description: 'A legendary weapon lies hidden' },
    })

    await page.click('aside >> text=Quests')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main >> text=Find the Lost Sword')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=active').first()).toBeVisible()
  })

  test('quest with sub-quest shows nesting', async ({ page }) => {
    await registerAndLogin(page, 'Sub Quest')
    await createCampaign(page, `Sub Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const parent = await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Main Quest' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Sub Quest Step', parentQuestId: (parent as any).id },
    })

    await page.click('aside >> text=Quests')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main >> text=Main Quest')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Sub Quest Step')).toBeVisible()
  })

  test('quest status filter', async ({ page }) => {
    await registerAndLogin(page, 'Status Filter')
    await createCampaign(page, `Status Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Active Quest', status: 'active' },
    })
    const doneQuest = await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Done Quest' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/quests/${(doneQuest as any).slug}`, {
      method: 'PUT',
      body: { status: 'completed' },
    })

    await page.click('aside >> text=Quests')
    await page.waitForLoadState('networkidle')

    // Filter to completed
    await page.click('main >> button:has-text("Completed")')
    await page.waitForTimeout(1000)
    await expect(page.locator('main >> text=Done Quest')).toBeVisible({ timeout: 5000 })
  })
})
