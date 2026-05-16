import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Character page tabs', () => {
  test('Main info tab is active by default and shows description', async ({ page }) => {
    await registerAndLogin(page, 'TabsDM')
    await createCampaign(page, `Tabs Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charRes = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: `TabHero ${uid()}`, characterType: 'pc' },
    })
    const slug = (charRes as Record<string, string>).slug

    await apiFetch(page, `/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      body: { content: 'Tall with red hair.' },
    })

    await page.goto(`/campaigns/${campaignId}/characters/${slug}`)
    await page.waitForLoadState('networkidle')

    // Main info tab trigger should be active by default
    const mainTrigger = page.locator('[role="tab"]:has-text("Main")')
    await expect(mainTrigger).toBeVisible({ timeout: 10000 })
    await expect(mainTrigger).toHaveAttribute('data-state', 'active')

    // Description is visible
    await expect(page.locator('[data-testid="character-description"]')).toBeVisible()
    await expect(page.locator('[data-testid="character-description"]')).toContainText(
      'Tall with red hair.',
    )
  })

  test('Story tab shows backstory and history', async ({ page }) => {
    await registerAndLogin(page, 'StoryDM')
    await createCampaign(page, `Story Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charRes = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: `StoryHero ${uid()}`, characterType: 'pc' },
    })
    const slug = (charRes as Record<string, string>).slug

    await apiFetch(page, `/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      body: { backstory: 'Born in the northern wastes.', history: 'Session 1: arrived.' },
    })

    await page.goto(`/campaigns/${campaignId}/characters/${slug}`)
    await page.waitForLoadState('networkidle')

    await page.locator('[role="tab"]:has-text("Story")').click()

    await expect(page.locator('[data-testid="character-backstory"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-testid="character-backstory"]')).toContainText(
      'Born in the northern wastes.',
    )
    await expect(page.locator('[data-testid="character-history"]')).toBeVisible()
    await expect(page.locator('[data-testid="character-history"]')).toContainText(
      'Session 1: arrived.',
    )
  })

  test('Relations tab shows organizations section', async ({ page }) => {
    await registerAndLogin(page, 'RelDM')
    await createCampaign(page, `Rel Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charRes = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: `RelHero ${uid()}`, characterType: 'pc' },
    })
    const slug = (charRes as Record<string, string>).slug

    await page.goto(`/campaigns/${campaignId}/characters/${slug}`)
    await page.waitForLoadState('networkidle')

    await page.locator('[role="tab"]:has-text("Relation")').click()

    await expect(page.locator('[data-testid="character-organizations"]')).toBeVisible({
      timeout: 10000,
    })
  })

  test('Play info tab shows template fields display', async ({ page }) => {
    await registerAndLogin(page, 'PlayDM')
    await createCampaign(page, `Play Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charRes = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: `PlayHero ${uid()}`, characterType: 'pc' },
    })
    const slug = (charRes as Record<string, string>).slug

    await page.goto(`/campaigns/${campaignId}/characters/${slug}`)
    await page.waitForLoadState('networkidle')

    await page.locator('[role="tab"]:has-text("Play")').click()

    // The Play info tab panel should be active
    const playPanel = page.locator('[role="tabpanel"][data-state="active"]')
    await expect(playPanel).toBeVisible({ timeout: 10000 })
  })

  test('clicking a tab updates ?tab= param and reloading preserves selection', async ({ page }) => {
    await registerAndLogin(page, 'UrlDM')
    await createCampaign(page, `URL Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charRes = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: `UrlHero ${uid()}`, characterType: 'pc' },
    })
    const slug = (charRes as Record<string, string>).slug

    await page.goto(`/campaigns/${campaignId}/characters/${slug}`)
    await page.waitForLoadState('networkidle')

    // Click Story tab
    await page.locator('[role="tab"]:has-text("Story")').click()
    await expect(page).toHaveURL(/[?&]tab=story/, { timeout: 5000 })

    // Reload and verify tab is still active
    await page.reload()
    await page.waitForLoadState('networkidle')
    const storyTrigger = page.locator('[role="tab"]:has-text("Story")')
    await expect(storyTrigger).toHaveAttribute('data-state', 'active', { timeout: 10000 })
  })
})
