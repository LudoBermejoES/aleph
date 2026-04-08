import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Character Actions', () => {
  test('duplicate character via API and verify copy exists', async ({ page }) => {
    await registerAndLogin(page, 'Duplicator')
    await createCampaign(page, `Dup Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const charName = `Original ${uid()}`

    const charRes = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: charName, characterType: 'npc', race: 'Elf', content: '# Original' },
    })

    // Duplicate
    await apiFetch(
      page,
      `/api/campaigns/${campaignId}/characters/${(charRes as Record<string, unknown>).slug}/duplicate`,
      {
        method: 'POST',
      },
    )

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
    await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: {
        name: charName,
        characterType: 'pc',
        race: 'Elf',
        class: 'Ranger',
        content: '# Legolas',
      },
    })

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await page.click(`main >> text=${charName}`)
    await page.waitForURL('**/characters/**', { timeout: 15000 })

    await expect(page.locator('main >> text=Elf').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Ranger').first()).toBeVisible()
  })
})
