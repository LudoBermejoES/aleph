/**
 * The diagram palette offers every entity type the campaign holds — not just characters and places.
 *
 * The defect this covers: the palette's generic group was queried as
 * `entities.type IN ('entity','wiki')`, two values no campaign uses, so objects, lore, notes, arcs
 * and sessions could not be placed on a diagram. It presented as a complete palette, because
 * `EntityPanel` hides empty groups — which is why this is asserted in the browser and not only at
 * the API: the API could return the group and the panel still not render it.
 */
import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch, BASE } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Diagram palette — entity types beyond characters and places', () => {
  test('an object appears in its own group and can be dropped on the canvas', async ({ page }) => {
    await registerAndLogin(page, `Palette DM ${uid()}`)
    await createCampaign(page, `Palette Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    expect(campaignId).toBeTruthy()

    // An object and a piece of lore. Neither was reachable from the palette before this change.
    const suit = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'El traje de oro', type: 'item', content: 'Kilo y medio de oro.' },
    })) as { id: string }
    await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'El sendero de plata', type: 'lore' },
    })

    const diagram = (await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'Palette diagram', diagramType: 'freeform' },
    })) as { id: string }

    await page.goto(`${BASE}/campaigns/${campaignId}/diagrams/${diagram.id}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // The panel must be expanded — collapsed state is remembered in localStorage per campaign.
    const expand = page.locator('[data-testid="expand-panel-btn"]')
    if (await expand.isVisible().catch(() => false)) await expand.click()

    await expect(page.locator('[data-testid="entity-search-input"]')).toBeVisible({
      timeout: 20000,
    })

    // The group itself, keyed by type slug rather than by its label: the label is the DM's own
    // editable `entity_types.name`, so asserting on it would break on a rename.
    await expect(page.locator('[data-testid="entity-group-item"]')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('[data-testid="entity-group-lore"]')).toBeVisible()

    // The group heading must NOT be a raw i18n key — the failure mode if a campaign type's name
    // were passed through t().
    const heading = await page.locator('[data-testid="entity-group-item"]').innerText()
    expect(heading.trim().length).toBeGreaterThan(0)
    expect(heading).not.toContain('diagrams.panel')

    // And the object is draggable onto the canvas.
    const card = page.locator(`[data-testid="entity-card-${suit.id}"]`)
    await expect(card).toBeVisible()
    await expect(card).toContainText('El traje de oro')
  })

  test('a campaign with no objects shows no objects group', async ({ page }) => {
    // The empty-group filter must survive the change: a group per declared type would otherwise
    // print nine empty headings at every DM who has not created one of each yet.
    await registerAndLogin(page, `Palette Empty DM ${uid()}`)
    await createCampaign(page, `Palette Empty Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const diagram = (await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'Empty palette', diagramType: 'freeform' },
    })) as { id: string }

    await page.goto(`${BASE}/campaigns/${campaignId}/diagrams/${diagram.id}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle')

    // Wait for the panel in EITHER state before touching it. Waiting on the expanded-only search
    // input first is a race: on a cold page this test failed on that selector while the defect it
    // covers was nowhere near it, which reads as the guard failing when it is the wait failing.
    await page.waitForSelector(
      '[data-testid="entity-search-input"], [data-testid="expand-panel-btn"]',
      { timeout: 30000 },
    )
    const expand = page.locator('[data-testid="expand-panel-btn"]')
    if (await expand.isVisible().catch(() => false)) await expand.click()
    await expect(page.locator('[data-testid="entity-search-input"]')).toBeVisible({
      timeout: 30000,
    })

    await expect(page.locator('[data-testid="entity-group-item"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="entity-group-session"]')).toHaveCount(0)
  })
})
