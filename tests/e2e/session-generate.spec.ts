import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Session AI Generate', () => {
  test('DM sees generate button on Summary tab, disabled without manual notes', async ({
    page,
  }) => {
    await registerAndLogin(page, `Gen DM ${uid()}`)
    await createCampaign(page, `Gen Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a session via API
    const session = await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: `Gen Test Session ${uid()}`, status: 'planned' },
    })

    // Navigate to session detail
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/sessions/${session.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // Click on Summary tab
    const summaryTab = page.locator('button', { hasText: 'Summary' })
    await expect(summaryTab).toBeVisible({ timeout: 10000 })
    await summaryTab.click()

    // Generate button should be visible but disabled (no manual notes)
    const generateBtn = page.locator('button', { hasText: 'Generate Summary' })
    await expect(generateBtn).toBeVisible({ timeout: 5000 })
    await expect(generateBtn).toBeDisabled()
  })

  test('Generate button enables after writing manual notes', async ({ page }) => {
    await registerAndLogin(page, `Gen DM2 ${uid()}`)
    await createCampaign(page, `Gen Camp2 ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const session = await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: `Gen Test Session2 ${uid()}`, status: 'planned' },
    })

    // Set manual notes via API
    await apiFetch(page, `/api/campaigns/${campaignId}/sessions/${session.slug}/content`, {
      method: 'PUT',
      body: { type: 'manual_notes', content: 'The party explored the dungeon and found treasure.' },
    })

    // Navigate to session detail
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/sessions/${session.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // Click on Summary tab
    const summaryTab = page.locator('button', { hasText: 'Summary' })
    await expect(summaryTab).toBeVisible({ timeout: 10000 })
    await summaryTab.click()

    // Generate button should be enabled now (manual notes exist)
    const generateBtn = page.locator('button', { hasText: 'Generate Summary' })
    await expect(generateBtn).toBeVisible({ timeout: 5000 })
    await expect(generateBtn).toBeEnabled()
  })

  test('AI Notes tab also shows generate button', async ({ page }) => {
    await registerAndLogin(page, `Gen DM3 ${uid()}`)
    await createCampaign(page, `Gen Camp3 ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const session = await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: `Gen Test Session3 ${uid()}`, status: 'planned' },
    })

    await apiFetch(page, `/api/campaigns/${campaignId}/sessions/${session.slug}/content`, {
      method: 'PUT',
      body: { type: 'manual_notes', content: 'Session notes for AI test.' },
    })

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/sessions/${session.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // Click on AI Notes tab
    const aiNotesTab = page.locator('button', { hasText: 'AI Notes' })
    await expect(aiNotesTab).toBeVisible({ timeout: 10000 })
    await aiNotesTab.click()

    // Generate AI Notes button should be visible and enabled
    const generateBtn = page.locator('button', { hasText: 'Generate AI Notes' })
    await expect(generateBtn).toBeVisible({ timeout: 5000 })
    await expect(generateBtn).toBeEnabled()
  })

  test('Manual Notes tab does not show generate button', async ({ page }) => {
    await registerAndLogin(page, `Gen DM4 ${uid()}`)
    await createCampaign(page, `Gen Camp4 ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const session = await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: `Gen Test Session4 ${uid()}`, status: 'planned' },
    })

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/sessions/${session.slug}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // On Manual Notes tab (default), no generate button
    const generateBtn = page.locator('button', { hasText: /Generate/ })
    await expect(generateBtn).toHaveCount(0)
  })
})
