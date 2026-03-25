import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Character Actions', () => {
  test('duplicate character via API and verify copy exists', async ({ page }) => {
    await registerAndLogin(page, 'Duplicator')
    await createCampaign(page, `Dup Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const charName = `Original ${uid()}`

    const charRes = await page.evaluate(async ([id, name]) => {
      const r = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, characterType: 'npc', race: 'Elf', content: '# Original' }),
      })
      return r.json()
    }, [campaignId, charName])

    // Duplicate
    await page.evaluate(async ([id, slug]) => {
      await fetch(`/api/campaigns/${id}/characters/${slug}/duplicate`, { method: 'POST' })
    }, [campaignId, (charRes as any).slug])

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')

    // Both original and copy should exist
    await expect(page.locator(`main >> text="${charName}"`)).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`main >> text="${charName} (Copy)"`)).toBeVisible({ timeout: 10000 })
  })

  test('character detail shows race and class', async ({ page }) => {
    await registerAndLogin(page, 'Detail Viewer')
    await createCampaign(page, `Detail Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const charName = `Legolas ${uid()}`
    await page.evaluate(async ([id, name]) => {
      await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, characterType: 'pc', race: 'Elf', class: 'Ranger', content: '# Legolas' }),
      })
    }, [campaignId, charName])

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await page.click(`main >> text=${charName}`)
    await page.waitForURL('**/characters/**', { timeout: 15000 })

    await expect(page.locator('main >> text=Elf').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Ranger').first()).toBeVisible()
  })
})
