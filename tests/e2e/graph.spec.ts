import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Relationship Graph', () => {
  test('navigate to graph page', async ({ page }) => {
    await registerAndLogin(page, 'Graph Viewer')
    await createCampaign(page, `GV Camp ${uid()}`)

    await page.click('aside a:has-text("Graph")')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Relationship Graph', { timeout: 10000 })
  })

  test('graph shows relationships when entities are connected', async ({ page }) => {
    await registerAndLogin(page, 'Graph Creator')
    await createCampaign(page, `GR Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const e1 = await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Hero', type: 'character', content: '# Hero' },
    })
    const e2 = await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Villain', type: 'character', content: '# Villain' },
    })
    const types = await apiFetch(page, `/api/campaigns/${campaignId}/relation-types`)

    const enemyType = (types as any[]).find((t: any) => t.slug === 'enemy')

    await apiFetch(page, `/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      body: {
        sourceEntityId: (e1 as any).id,
        targetEntityId: (e2 as any).id,
        relationTypeId: enemyType?.id,
        forwardLabel: 'enemy of',
        reverseLabel: 'enemy of',
        attitude: -80,
      },
    })

    await page.click('aside a:has-text("Graph")')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main >> text=Hero').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Villain').first()).toBeVisible()
  })
})
