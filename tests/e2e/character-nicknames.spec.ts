import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch, BASE } from './helpers'

const uid = () => `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`

test.describe('Character nicknames', () => {
  test('a nickname added on the character page persists and can be removed', async ({ page }) => {
    await registerAndLogin(page, `Nick DM ${uid()}`)
    await createCampaign(page, `Nick Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string

    const charName = `Otto Von Grugger ${uid()}`
    const char = (await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: charName, characterType: 'pc' },
    })) as { slug: string }

    await page.goto(`${BASE}/campaigns/${campaignId}/characters/${char.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    const panel = page.locator('[data-testid="nicknames-panel"]')
    await expect(panel).toBeVisible({ timeout: 15000 })
    await expect(panel.locator('[data-testid="nicknames-empty"]')).toBeVisible()

    const nickname = `Der Wolf ${uid()}`
    await panel.locator('[data-testid="nickname-input"]').fill(nickname)
    await panel.locator('[data-testid="add-nickname"]').click()

    const chip = panel.locator('[data-testid="nickname-chip"]')
    await expect(chip).toContainText(nickname, { timeout: 15000 })

    // Reload to confirm the nickname was actually persisted server-side, not just local state
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="nickname-chip"]')).toContainText(nickname, {
      timeout: 15000,
    })

    await page.locator('[data-testid="remove-nickname"]').click()
    await expect(page.locator('[data-testid="nicknames-empty"]')).toBeVisible({ timeout: 15000 })
  })
})
