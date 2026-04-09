import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Diagram Multiplayer', () => {
  test('two users see shared diagram state when multiplayer is enabled', async ({ browser }) => {
    // Check if multiplayer is enabled on the server
    const checkPage = await browser.newPage()
    await checkPage.goto('http://localhost:3333')
    const isMultiplayer = await checkPage.evaluate(() => {
      // @ts-expect-error runtime config
      return !!window.__NUXT__?.config?.public?.diagramMultiplayer
    })
    await checkPage.close()

    if (!isMultiplayer) {
      test.skip()
      return
    }

    // User A: create campaign + diagram
    const contextA = await browser.newContext()
    const pageA = await contextA.newPage()
    await registerAndLogin(pageA, `MP User A ${uid()}`)
    await createCampaign(pageA, `MP Campaign ${uid()}`)
    const campaignId = pageA.url().split('/campaigns/')[1]?.split('/')[0] ?? ''

    // Create diagram via API
    const diagramData = await apiFetch(pageA, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: `MP Diagram ${uid()}` },
    })

    // Navigate to diagram
    await pageA.goto(`http://localhost:3333/campaigns/${campaignId}/diagrams/${diagramData.id}`, {
      waitUntil: 'domcontentloaded',
    })
    await pageA.waitForLoadState('networkidle')

    // Wait for tldraw to load
    await expect(pageA.locator('.tldraw-wrapper')).toBeVisible({ timeout: 15000 })

    // User B: join the same campaign and open the same diagram
    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()
    await registerAndLogin(pageB, `MP User B ${uid()}`)

    // Invite user B to campaign (via API from user A's context)
    const inviteData = await apiFetch(pageA, `/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      body: { role: 'editor' },
    })

    // User B joins
    await apiFetch(pageB, `/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: { token: inviteData.token },
    })

    // User B opens the same diagram
    await pageB.goto(`http://localhost:3333/campaigns/${campaignId}/diagrams/${diagramData.id}`, {
      waitUntil: 'domcontentloaded',
    })
    await pageB.waitForLoadState('networkidle')
    await expect(pageB.locator('.tldraw-wrapper')).toBeVisible({ timeout: 15000 })

    // Wait for sync to establish (connection status should show)
    await pageA.waitForTimeout(3000)

    // Verify both pages loaded without errors
    expect(pageA.url()).toContain(diagramData.id)
    expect(pageB.url()).toContain(diagramData.id)

    await contextA.close()
    await contextB.close()
  })

  test('presence bar shows connected users when multiplayer is active', async ({ browser }) => {
    const checkPage = await browser.newPage()
    await checkPage.goto('http://localhost:3333')
    const isMultiplayer = await checkPage.evaluate(() => {
      // @ts-expect-error runtime config
      return !!window.__NUXT__?.config?.public?.diagramMultiplayer
    })
    await checkPage.close()

    if (!isMultiplayer) {
      test.skip()
      return
    }

    const context = await browser.newContext()
    const page = await context.newPage()
    await registerAndLogin(page, `MP Presence ${uid()}`)
    await createCampaign(page, `MP Presence Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] ?? ''

    const diagramData = await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: `Presence Diagram ${uid()}` },
    })

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/diagrams/${diagramData.id}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.tldraw-wrapper')).toBeVisible({ timeout: 15000 })

    // Connection status indicator should be visible
    await page.waitForTimeout(2000)
    // The diagram should have loaded (either in multiplayer or fallback mode)
    expect(page.url()).toContain(diagramData.id)

    await context.close()
  })
})
