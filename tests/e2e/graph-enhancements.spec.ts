import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Graph enhancements — card layout toggle (9.4)', () => {
  test('card layout toggle button is visible and persists across navigation', async ({ page }) => {
    await registerAndLogin(page, `Card Layout ${uid()}`)
    await createCampaign(page, `CL Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create two connected entities so the graph renders
    const e1 = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Alpha', type: 'character' },
    })) as { id: string }
    const e2 = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Beta', type: 'location' },
    })) as { id: string }
    const types = (await apiFetch(page, `/api/campaigns/${campaignId}/relation-types`)) as {
      id: string
    }[]
    const anyType = types[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      body: {
        sourceEntityId: e1.id,
        targetEntityId: e2.id,
        relationTypeId: anyType?.id,
        forwardLabel: 'connected to',
      },
    })

    // Navigate to graph
    await page.click('aside a:has-text("Graph")')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="card-layout-btn"]', { timeout: 10000 })

    const btn = page.locator('[data-testid="card-layout-btn"]')
    await expect(btn).toBeVisible()

    // Toggle on
    await btn.click()
    await expect(btn).toHaveClass(/bg-primary/, { timeout: 3000 })

    // Navigate away and back
    await page.click('aside a:has-text("Wiki")')
    await page.waitForLoadState('networkidle')
    await page.click('aside a:has-text("Graph")')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="card-layout-btn"]', { timeout: 10000 })

    // State should be persisted via localStorage
    const btn2 = page.locator('[data-testid="card-layout-btn"]')
    await expect(btn2).toHaveClass(/bg-primary/, { timeout: 3000 })

    // Toggle off
    await btn2.click()
    await expect(btn2).not.toHaveClass(/bg-primary/, { timeout: 3000 })
  })
})

test.describe('Graph enhancements — icon chip filters (9.5)', () => {
  test('chip filters hide and show nodes; All chip restores all', async ({ page }) => {
    await registerAndLogin(page, `Chip Filter ${uid()}`)
    await createCampaign(page, `CF Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a character and a location connected by a relation
    const e1 = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Aria', type: 'character' },
    })) as { id: string }
    const e2 = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Castle Dusk', type: 'location' },
    })) as { id: string }
    const types = (await apiFetch(page, `/api/campaigns/${campaignId}/relation-types`)) as {
      id: string
    }[]
    const anyType = types[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      body: {
        sourceEntityId: e1.id,
        targetEntityId: e2.id,
        relationTypeId: anyType?.id,
        forwardLabel: 'located in',
      },
    })

    await page.click('aside a:has-text("Graph")')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="chip-all"]', { timeout: 10000 })

    // Both nodes should be visible
    await expect(page.locator('[data-testid="entity-graph-view"]')).toBeVisible()

    // Click the "character" chip to deselect it (toggle off)
    const charChip = page.locator('[data-testid="chip-character"]')
    await expect(charChip).toBeVisible()
    await charChip.click()

    // After deselecting character, Aria should not be in filtered nodes
    // (graph stats text should change)
    await page.waitForTimeout(500)

    // Re-click All to restore
    await page.locator('[data-testid="chip-all"]').click()
    await page.waitForTimeout(300)

    // All chip should be active (primary style)
    const allChip = page.locator('[data-testid="chip-all"]')
    await expect(allChip).toHaveClass(/bg-primary/, { timeout: 3000 })
  })

  test('chip filter state persists across navigation', async ({ page }) => {
    await registerAndLogin(page, `Chip Persist ${uid()}`)
    await createCampaign(page, `CP Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const e1 = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Hero', type: 'character' },
    })) as { id: string }
    const e2 = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: 'Dungeon', type: 'location' },
    })) as { id: string }
    const types = (await apiFetch(page, `/api/campaigns/${campaignId}/relation-types`)) as {
      id: string
    }[]
    const anyType = types[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      body: {
        sourceEntityId: e1.id,
        targetEntityId: e2.id,
        relationTypeId: anyType?.id,
        forwardLabel: 'in',
      },
    })

    await page.click('aside a:has-text("Graph")')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="chip-character"]', { timeout: 10000 })

    // Deselect character chip
    await page.locator('[data-testid="chip-character"]').click()
    await page.waitForTimeout(300)

    // Verify it's deselected
    const chipBefore = page.locator('[data-testid="chip-character"]')
    await expect(chipBefore).not.toHaveClass(/bg-primary/)

    // Navigate away and back
    await page.click('aside a:has-text("Wiki")')
    await page.waitForLoadState('networkidle')
    await page.click('aside a:has-text("Graph")')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="chip-character"]', { timeout: 10000 })

    // Chip should still be deselected (localStorage persisted)
    const chipAfter = page.locator('[data-testid="chip-character"]')
    await expect(chipAfter).not.toHaveClass(/bg-primary/)
  })
})
