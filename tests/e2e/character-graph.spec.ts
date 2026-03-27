import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Character Relationship Graph', () => {
  test('graph section hidden when character has no relations or connections', async ({ page }) => {
    await registerAndLogin(page, `NoRel ${uid()}`)
    await createCampaign(page, `NoRel Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a character with no relations
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Loner', characterType: 'npc' }),
      })
    }, campaignId)

    await page.click('aside a:has-text("Characters")')
    await page.waitForLoadState('networkidle')
    await page.click('main >> text=Loner')
    await page.waitForURL('**/characters/**', { timeout: 15000 })

    await expect(page.locator('[data-testid="character-graph"]')).not.toBeVisible()
  })

  test('graph section appears when character has a relation', async ({ page }) => {
    await registerAndLogin(page, `WithRel ${uid()}`)
    await createCampaign(page, `WithRel Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create two characters and a relation between them
    const [c1Slug, c2Slug] = await page.evaluate(async (id) => {
      const c1 = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'HeroA', characterType: 'npc' }),
      }).then(r => r.json())

      const c2 = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'HeroB', characterType: 'npc' }),
      }).then(r => r.json())

      // Get entity IDs from entity list
      const entities = await fetch(`/api/campaigns/${id}/entities`).then(r => r.json())
      const entityList = entities.entities ?? entities
      const e1 = entityList.find((e: any) => e.slug === c1.slug)
      const e2 = entityList.find((e: any) => e.slug === c2.slug)

      // Get a relation type
      const types = await fetch(`/api/campaigns/${id}/relation-types`).then(r => r.json())
      const customType = types.find((t: any) => t.slug === 'ally')

      await fetch(`/api/campaigns/${id}/relations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceEntityId: e1.id,
          targetEntityId: e2.id,
          relationTypeId: customType.id,
          forwardLabel: 'ally of',
          reverseLabel: 'ally of',
          attitude: 80,
        }),
      })

      return [c1.slug, c2.slug]
    }, campaignId)

    // Navigate to HeroA's character page
    await page.goto(`/campaigns/${campaignId}/characters/${c1Slug}`)
    await page.waitForLoadState('networkidle')

    // Graph section should be visible
    await expect(page.locator('[data-testid="character-graph"]')).toBeVisible({ timeout: 15000 })
    // The heading should show the i18n key result
    await expect(page.locator('[data-testid="character-graph"] h2')).toBeVisible()
  })

  test('graph section appears when character has a connection', async ({ page }) => {
    await registerAndLogin(page, `WithConn ${uid()}`)
    await createCampaign(page, `WithConn Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const c1Slug = await page.evaluate(async (id) => {
      const c1 = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Connector', characterType: 'npc' }),
      }).then(r => r.json())

      const c2 = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Connected', characterType: 'npc' }),
      }).then(r => r.json())

      const entities = await fetch(`/api/campaigns/${id}/entities`).then(r => r.json())
      const entityList = entities.entities ?? entities
      const e2 = entityList.find((e: any) => e.slug === c2.slug)

      await fetch(`/api/campaigns/${id}/characters/${c1.slug}/connections`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEntityId: e2.id, label: 'knows' }),
      })

      return c1.slug
    }, campaignId)

    await page.goto(`/campaigns/${campaignId}/characters/${c1Slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="character-graph"]')).toBeVisible({ timeout: 15000 })
  })
})
