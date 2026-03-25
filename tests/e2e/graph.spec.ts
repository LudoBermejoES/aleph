import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Relationship Graph', () => {
  test('navigate to graph page', async ({ page }) => {
    await registerAndLogin(page, 'Graph Viewer')
    await createCampaign(page, `Graph Camp ${uid()}`)

    await page.click('aside >> text=Graph')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Relationship Graph', { timeout: 10000 })
  })

  test('graph shows relationships when entities are connected', async ({ page }) => {
    await registerAndLogin(page, 'Graph Creator')
    await createCampaign(page, `Graph Rel ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create two entities and a relation via API
    const [e1, e2, types] = await page.evaluate(async (id) => {
      const r1 = await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hero', type: 'character', content: '# Hero' }),
      }).then(r => r.json())

      const r2 = await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Villain', type: 'character', content: '# Villain' }),
      }).then(r => r.json())

      const typesRes = await fetch(`/api/campaigns/${id}/relation-types`).then(r => r.json())

      return [r1, r2, typesRes]
    }, campaignId)

    const enemyType = (types as any[]).find((t: any) => t.slug === 'enemy')

    await page.evaluate(async ([id, srcId, tgtId, typeId]) => {
      await fetch(`/api/campaigns/${id}/relations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceEntityId: srcId, targetEntityId: tgtId,
          relationTypeId: typeId, forwardLabel: 'enemy of', reverseLabel: 'enemy of',
          attitude: -80,
        }),
      })
    }, [campaignId, (e1 as any).id, (e2 as any).id, enemyType?.id])

    await page.click('aside >> text=Graph')
    await page.waitForLoadState('networkidle')

    // Should show the two entities in the graph
    await expect(page.locator('main >> text=Hero').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Villain').first()).toBeVisible()
  })
})
