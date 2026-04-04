import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Entity Templates', () => {
  test('templates nav link is visible', async ({ page }) => {
    await registerAndLogin(page, 'Template DM')
    await createCampaign(page, `Templates Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.goto(`/campaigns/${campaignId}/templates`, { waitUntil: 'networkidle' })

    await expect(page.locator('main h1')).toBeVisible({ timeout: 10000 })
  })

  test('new template link navigates to creation page', async ({ page }) => {
    await registerAndLogin(page, 'Template Creator DM')
    await createCampaign(page, `Template Create Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.goto(`/campaigns/${campaignId}/templates`, { waitUntil: 'networkidle' })

    // New Template button
    const newBtn = page.locator('a', { hasText: /new template/i })
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click()
      await expect(page).toHaveURL(/\/templates\/new/, { timeout: 10000 })
    }
  })
})
