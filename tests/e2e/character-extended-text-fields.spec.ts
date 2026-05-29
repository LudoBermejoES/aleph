import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Character extended text fields', () => {
  test('DM edits backstory on edit page and it persists on detail page', async ({ page }) => {
    await registerAndLogin(page, 'BackstoryDM')
    await createCampaign(page, `Backstory Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const charName = `Aria ${uid()}`

    const charRes = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: charName, characterType: 'pc' },
    })
    const slug = (charRes as Record<string, string>).slug

    // Fill in backstory via API (MarkdownEditor is a client-only component)
    await apiFetch(page, `/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      body: { backstory: 'Born in the northern mountains.' },
    })

    // Navigate to detail page — backstory is on the "story" tab
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/characters/${slug}?tab=story`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="character-backstory"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="character-backstory"]')).toContainText(
      'Born in the northern mountains.',
    )
  })

  test('detail page shows history and current status sections when populated', async ({ page }) => {
    await registerAndLogin(page, 'HistoryDM')
    await createCampaign(page, `History Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const charName = `Brom ${uid()}`

    const charRes = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: charName, characterType: 'npc' },
    })
    const slug = (charRes as Record<string, string>).slug

    await apiFetch(page, `/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      body: {
        history: 'Session 1: met the party.',
        currentStatus: 'Currently travelling south.',
      },
    })

    // currentStatus is on the main tab (default)
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/characters/${slug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="character-current-status"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="character-current-status"]')).toContainText(
      'Currently travelling south.',
    )

    // history is on the story tab
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/characters/${slug}?tab=story`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="character-history"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="character-history"]')).toContainText(
      'Session 1: met the party.',
    )
  })

  test('detail page hides sections when fields are null', async ({ page }) => {
    await registerAndLogin(page, 'NullFieldDM')
    await createCampaign(page, `Null Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const charName = `Null ${uid()}`

    const charRes = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: charName, characterType: 'npc' },
    })
    const slug = (charRes as Record<string, string>).slug

    // main tab — currentStatus is hidden when null
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/characters/${slug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="character-current-status"]')).not.toBeVisible()

    // story tab — backstory/history hidden when null
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/characters/${slug}?tab=story`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="character-backstory"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="character-history"]')).not.toBeVisible()
  })
})
