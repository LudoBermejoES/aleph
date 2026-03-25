import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Session Log', () => {
  test('edit session log and preview markdown', async ({ page }) => {
    await registerAndLogin(page, 'Log Editor')
    await createCampaign(page, `Log Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const sessRes = await page.evaluate(async (id) => {
      const r = await fetch(`/api/campaigns/${id}/sessions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Session With Log' }),
      })
      return r.json()
    }, campaignId)

    await page.click('aside >> text=Sessions')
    await page.waitForLoadState('networkidle')
    await page.click('main >> text=Session With Log')
    await page.waitForURL('**/sessions/**', { timeout: 15000 })

    // Click Edit on session log
    await page.click('main >> button:has-text("Edit")')
    await page.waitForTimeout(500)

    const textarea = page.locator('main textarea')
    await expect(textarea).toBeVisible({ timeout: 5000 })
    await textarea.fill('# Session 1 Log\n\nThe party entered the dungeon.')
    await page.click('main >> button:has-text("Save")')
    await page.waitForTimeout(2000)

    // Click Preview to see rendered markdown
    await expect(page.locator('main >> text=entered the dungeon')).toBeVisible({ timeout: 10000 })
  })

  test('change session status', async ({ page }) => {
    await registerAndLogin(page, 'Status Changer')
    await createCampaign(page, `Status Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/sessions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Status Session' }),
      })
    }, campaignId)

    await page.click('aside >> text=Sessions')
    await page.waitForLoadState('networkidle')
    await page.click('main >> text=Status Session')
    await page.waitForURL('**/sessions/**', { timeout: 15000 })

    // Change status to active
    await page.selectOption('main select', 'active')
    await page.waitForTimeout(1000)
    await expect(page.locator('main >> text=active').first()).toBeVisible({ timeout: 5000 })
  })
})
