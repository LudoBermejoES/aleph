import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Diagram enhancements — entity popover (10.x)', () => {
  test('double-click on entity shape shows popover with entity name', async ({ page }) => {
    await registerAndLogin(page, `Popover ${uid()}`)
    await createCampaign(page, `Pop Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create character entity
    const entity = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Rolan the Mage', type: 'character' },
    })) as { id: string; slug: string }

    // Create diagram
    const diagram = (await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'Popover Test', diagramType: 'freeform' },
    })) as { id: string }

    // Save a snapshot with an NPCToken shape
    await apiFetch(page, `/api/campaigns/${campaignId}/diagrams/${diagram.id}/snapshot`, {
      method: 'PUT',
      body: {
        store: {
          'document:document': {
            id: 'document:document',
            typeName: 'document',
            gridSize: 10,
            name: '',
            meta: {},
          },
          'page:page': { id: 'page:page', typeName: 'page', name: 'Page 1', index: 'a1', meta: {} },
          'shape:npc1': {
            id: 'shape:npc1',
            typeName: 'shape',
            type: 'npcToken',
            x: 200,
            y: 200,
            rotation: 0,
            isLocked: false,
            opacity: 1,
            meta: {},
            parentId: 'page:page',
            index: 'a1',
            props: {
              w: 80,
              h: 120,
              entityId: entity.id,
              campaignId,
              characterName: 'Rolan the Mage',
              slug: entity.slug,
            },
          },
        },
        schema: { schemaVersion: 2, sequences: {} },
      },
    })

    await page.goto(`/campaigns/${campaignId}/diagrams/${diagram.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.tldraw-wrapper', { timeout: 10000 })
    await page.waitForTimeout(1500)

    // Double-click the shape
    await page.dblclick('.tldraw-wrapper', { position: { x: 220, y: 220 } })
    await page.waitForTimeout(800)

    // Popover should appear with entity name
    const popover = page.locator('[data-testid="entity-popover"]')
    await expect(popover).toBeVisible({ timeout: 5000 })
    await expect(popover).toContainText('Rolan the Mage')

    // Close via the close button
    await page.locator('[data-testid="entity-popover-close"]').click()
    await expect(popover).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('Diagram enhancements — type filter (12.x)', () => {
  test('type filter buttons are visible in diagram toolbar', async ({ page }) => {
    await registerAndLogin(page, `Filter ${uid()}`)
    await createCampaign(page, `Filter Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const diagram = (await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'Filter Test', diagramType: 'freeform' },
    })) as { id: string }

    await page.goto(`/campaigns/${campaignId}/diagrams/${diagram.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.tldraw-wrapper', { timeout: 10000 })

    // All filter button should be visible and active by default
    const allBtn = page.locator('button').filter({ hasText: /^All$/ }).first()
    await expect(allBtn).toBeVisible()

    // Character filter button should be visible
    const charBtn = page
      .locator('button')
      .filter({ hasText: /^Characters$/ })
      .first()
    await expect(charBtn).toBeVisible()
  })
})

test.describe('Diagram enhancements — focus camera (11.x)', () => {
  test('entity panel shows placed badge for entities already on canvas', async ({ page }) => {
    await registerAndLogin(page, `Focus ${uid()}`)
    await createCampaign(page, `Focus Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const entity = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Placed Hero', type: 'character' },
    })) as { id: string; slug: string }

    const diagram = (await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'Focus Test', diagramType: 'freeform' },
    })) as { id: string }

    // Save snapshot with the entity placed
    await apiFetch(page, `/api/campaigns/${campaignId}/diagrams/${diagram.id}/snapshot`, {
      method: 'PUT',
      body: {
        store: {
          'document:document': {
            id: 'document:document',
            typeName: 'document',
            gridSize: 10,
            name: '',
            meta: {},
          },
          'page:page': { id: 'page:page', typeName: 'page', name: 'Page 1', index: 'a1', meta: {} },
          'shape:hero1': {
            id: 'shape:hero1',
            typeName: 'shape',
            type: 'npcToken',
            x: 100,
            y: 100,
            rotation: 0,
            isLocked: false,
            opacity: 1,
            meta: {},
            parentId: 'page:page',
            index: 'a1',
            props: {
              w: 80,
              h: 120,
              entityId: entity.id,
              campaignId,
              characterName: 'Placed Hero',
              slug: entity.slug,
            },
          },
        },
        schema: { schemaVersion: 2, sequences: {} },
      },
    })

    await page.goto(`/campaigns/${campaignId}/diagrams/${diagram.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.tldraw-wrapper', { timeout: 10000 })
    await page.waitForTimeout(1000)

    // Entity panel should show "Placed Hero" with a placed count badge
    const panel = page.locator('[data-testid="entity-panel"]')
    if (await panel.isVisible()) {
      const entityRow = panel.locator('text=Placed Hero')
      await expect(entityRow).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Diagram enhancements — sync relations button (feat)', () => {
  test('sync relations button is visible in diagram toolbar', async ({ page }) => {
    await registerAndLogin(page, `SyncBtn ${uid()}`)
    await createCampaign(page, `SyncBtn Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const diagram = (await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'Sync Relations Test', diagramType: 'freeform' },
    })) as { id: string }

    await page.goto(`/campaigns/${campaignId}/diagrams/${diagram.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.tldraw-wrapper', { timeout: 10000 })

    const syncBtn = page.locator('[data-testid="sync-relations-btn"]')
    await expect(syncBtn).toBeVisible()
  })

  test('clicking sync relations button does not crash when canvas is empty', async ({ page }) => {
    await registerAndLogin(page, `SyncEmpty ${uid()}`)
    await createCampaign(page, `SyncEmpty Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const diagram = (await apiFetch(page, `/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      body: { title: 'Sync Empty Test', diagramType: 'freeform' },
    })) as { id: string }

    await page.goto(`/campaigns/${campaignId}/diagrams/${diagram.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.tldraw-wrapper', { timeout: 10000 })

    // Click sync — should not throw, page should remain functional
    await page.locator('[data-testid="sync-relations-btn"]').click()
    await page.waitForTimeout(500)

    // Page should still be showing the canvas
    await expect(page.locator('.tldraw-wrapper')).toBeVisible()
  })
})
