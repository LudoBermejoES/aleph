import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Sessions', () => {
  test('navigate to sessions page', async ({ page }) => {
    await registerAndLogin(page, 'Sess Viewer')
    await createCampaign(page, `Sess Camp ${uid()}`)

    await page.click('aside >> text=Sessions')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Sessions', { timeout: 10000 })
  })

  test('create session and view detail', async ({ page }) => {
    await registerAndLogin(page, 'Sess Creator')
    await createCampaign(page, `Sess Detail ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'The Beginning' }),
      })
    }, campaignId)

    await page.click('aside >> text=Sessions')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main >> text=The Beginning')).toBeVisible({ timeout: 10000 })

    await page.click('main >> text=The Beginning')
    await page.waitForURL('**/sessions/**', { timeout: 15000 })
    await expect(page.locator('main h1')).toContainText('The Beginning', { timeout: 10000 })
  })
})

test.describe('Quests', () => {
  test('navigate to quests page', async ({ page }) => {
    await registerAndLogin(page, 'Quest Viewer')
    await createCampaign(page, `Quest Camp ${uid()}`)

    await page.click('aside >> text=Quests')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Quests', { timeout: 10000 })
  })
})
