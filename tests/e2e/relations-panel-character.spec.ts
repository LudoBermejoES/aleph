import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-5)

test.describe('Relations panel — character detail page', () => {
  test('panel renders in the Relations tab with empty state', async ({ page }) => {
    await registerAndLogin(page, 'Rel Panel User')
    await createCampaign(page, `Rel Panel Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const hero = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Panel Hero', characterType: 'pc' },
    })
    const charSlug = (hero as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}`)
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Relations"), [role="tab"]:has-text("Relations")')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })
    await expect(page.locator('button:has-text("Add Relation")')).toBeVisible({ timeout: 5000 })
  })

  test('DM can add a relation between two characters', async ({ page }) => {
    await registerAndLogin(page, 'Rel Add User')
    await createCampaign(page, `Rel Add Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const src = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Source Char', characterType: 'pc' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Target Char', characterType: 'npc' },
    })
    const charSlug = (src as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}`)
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Relations"), [role="tab"]:has-text("Relations")')
    await page.waitForTimeout(500)

    await page.click('button:has-text("Add Relation")')

    // Search for target entity
    await page.waitForSelector('[data-testid="relation-target-search"]', { timeout: 5000 })
    await page.fill('[data-testid="relation-target-search"]', 'Target')
    await page.waitForTimeout(500)

    // Pick from dropdown
    await page.click('button:has-text("Target Char")')

    // Fill forward label (required)
    await page.locator('input[placeholder*="allies with"]').fill('ally of')

    // Save
    await page.click('[role="dialog"] button:has-text("Save")')

    // Relation should appear in the panel
    await expect(page.locator('main')).toContainText('Target Char', { timeout: 10000 })
    await expect(page.locator('main')).toContainText('ally of', { timeout: 5000 })
  })

  test('DM can delete a relation from the panel', async ({ page }) => {
    await registerAndLogin(page, 'Rel Delete User')
    await createCampaign(page, `Rel Del Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const alice = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Alice Del', characterType: 'pc' },
    })
    const bob = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Bob Del', characterType: 'npc' },
    })

    // Pre-create a relation via API
    await apiFetch(page, `/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      body: {
        sourceEntityId: (alice as Record<string, unknown>).entityId,
        targetEntityId: (bob as Record<string, unknown>).entityId,
        forwardLabel: 'ally of',
        reverseLabel: 'ally of',
      },
    })

    const charSlug = (alice as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}`)
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Relations"), [role="tab"]:has-text("Relations")')
    await page.waitForTimeout(500)

    // Wait for relation to appear
    await expect(page.locator('main')).toContainText('Bob Del', { timeout: 10000 })

    // Click Delete
    await page.click('main button:has-text("Delete")')

    // Confirm in AlertDialog
    await page.click('[role="alertdialog"] button:has-text("Delete")')

    // Panel should show empty state
    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })
  })

  test('relation added via panel appears in the Relations section on the target character page', async ({
    page,
  }) => {
    await registerAndLogin(page, 'Rel Cross User')
    await createCampaign(page, `Rel Cross Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const charA = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Char Alpha', characterType: 'pc' },
    })
    const charB = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Char Beta', characterType: 'npc' },
    })

    // Add relation via API
    await apiFetch(page, `/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      body: {
        sourceEntityId: (charA as Record<string, unknown>).entityId,
        targetEntityId: (charB as Record<string, unknown>).entityId,
        forwardLabel: 'mentor of',
        reverseLabel: 'mentored by',
      },
    })

    // Visit target (charB) and verify reverse relation shows in its relations section
    const slugB = (charB as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${slugB}`)
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Relations"), [role="tab"]:has-text("Relations")')
    await page.waitForTimeout(500)

    // Should see Char Alpha referenced in the read-only relations list or panel
    await expect(page.locator('main')).toContainText('Char Alpha', { timeout: 10000 })
  })
})
