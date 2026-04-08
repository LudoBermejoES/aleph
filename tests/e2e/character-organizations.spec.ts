import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

// ─── Create character with organization ──────────────────────────────────────

test.describe('Character create — organization picker', () => {
  test('org picker is hidden when no organizations exist', async ({ page }) => {
    await registerAndLogin(page, 'Char Org Hidden User')
    await createCampaign(page, `Char Org Hidden Camp ${uid()}`)

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await page.click('[data-testid="new-character-btn"]')
    await page.waitForURL('**/characters/new', { timeout: 10000 })

    // No organizations in campaign — section should not appear
    await expect(page.locator('text=Organizations'))
      .not.toBeVisible({ timeout: 3000 })
      .catch(() => {})
  })

  test('org picker appears when organizations exist', async ({ page }) => {
    await registerAndLogin(page, 'Char Org Picker User')
    await createCampaign(page, `Char Org Picker Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'The Order' },
    })

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await page.click('[data-testid="new-character-btn"]')
    await page.waitForURL('**/characters/new', { timeout: 10000 })

    // Wait for form to load orgs
    await expect(page.locator('main label:has-text("Organizations")')).toBeVisible({
      timeout: 10000,
    })
  })

  test('create character with organization membership', async ({ page }) => {
    await registerAndLogin(page, 'Char Org Create User')
    await createCampaign(page, `Char Org Create Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'The Fellowship' },
    })

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await page.click('[data-testid="new-character-btn"]')
    await page.waitForURL('**/characters/new', { timeout: 10000 })

    // Fill character name
    const charName = `Frodo ${uid()}`
    await page.fill('input[placeholder*="Character name"]', charName)

    // Wait for org section to load then click + Add Organization
    await expect(page.locator('main label:has-text("Organizations")')).toBeVisible({
      timeout: 10000,
    })
    await page.click('button:has-text("+ Add Organization"), button:has-text("Add Organization")')

    // Select the org in the newly added membership row
    await page.locator('main .space-y-2 select').last().selectOption({ label: 'The Fellowship' })

    // Enter a role
    const roleInputs = page.locator('input[placeholder*="Ring-bearer"]')
    await roleInputs.last().fill('Ring-bearer')

    // Submit
    await page.click('button[type="submit"]')
    await expect(async () => {
      expect(page.url()).toMatch(/\/characters\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })

    // Detail page should show the org membership
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText(
      'The Fellowship',
      { timeout: 10000 },
    )
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText(
      'Ring-bearer',
      { timeout: 5000 },
    )
  })
})

// ─── Edit character — organization picker ────────────────────────────────────

test.describe('Character edit — organization picker', () => {
  test('edit page pre-fills existing org memberships', async ({ page }) => {
    await registerAndLogin(page, 'Char Edit Org User')
    await createCampaign(page, `Char Edit Org Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const org = await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'Rivendell Council' },
    })
    const char = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Elrond', characterType: 'npc' },
    })
    await apiFetch(
      page,
      `/api/campaigns/${campaignId}/organizations/${(org as Record<string, unknown>).slug}/members`,
      {
        method: 'POST',
        body: { characterId: (char as Record<string, unknown>).id, role: 'Lord' },
      },
    )
    const charSlug = (char as Record<string, unknown>).slug

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}/edit`)
    await page.waitForLoadState('networkidle')

    // Org section should show the existing membership pre-filled — select has the org selected
    await expect(async () => {
      const selectedText = await page
        .locator('main .space-y-2 select')
        .first()
        .evaluate((el: HTMLSelectElement) => el.options[el.selectedIndex]?.text ?? '')
      expect(selectedText).toBe('Rivendell Council')
    }).toPass({ timeout: 10000 })
    await expect(page.locator('input[placeholder*="Ring-bearer"]').first()).toHaveValue('Lord', {
      timeout: 5000,
    })
  })

  test('edit page — add new org membership and save', async ({ page }) => {
    await registerAndLogin(page, 'Char Edit Add Org User')
    await createCampaign(page, `Char Edit Add Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'Grey Havens' },
    })
    const cirdan = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Cirdan', characterType: 'npc' },
    })
    const charSlug = (cirdan as Record<string, unknown>).slug

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}/edit`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main label:has-text("Organizations")')).toBeVisible({
      timeout: 10000,
    })

    // Add membership
    await page.click('button:has-text("+ Add Organization"), button:has-text("Add Organization")')
    await page.locator('main .space-y-2 select').last().selectOption({ label: 'Grey Havens' })
    await page.locator('input[placeholder*="Ring-bearer"]').last().fill('Shipwright')

    // Save
    await page.click('button[type="submit"]:has-text("Save")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/characters\/[^/]+$/)
      expect(page.url()).not.toContain('/edit')
    }).toPass({ timeout: 15000 })

    // Detail page shows the new membership
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText(
      'Grey Havens',
      { timeout: 10000 },
    )
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText(
      'Shipwright',
      { timeout: 5000 },
    )
  })

  test('edit page — remove org membership and save', async ({ page }) => {
    await registerAndLogin(page, 'Char Edit Remove Org User')
    await createCampaign(page, `Char Edit Remove Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const shireWatch = await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'Shire Watch' },
    })
    const bilbo = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Bilbo', characterType: 'pc' },
    })
    await apiFetch(
      page,
      `/api/campaigns/${campaignId}/organizations/${(shireWatch as Record<string, unknown>).slug}/members`,
      {
        method: 'POST',
        body: { characterId: (bilbo as Record<string, unknown>).id, role: 'Burglar' },
      },
    )
    const charSlug = (bilbo as Record<string, unknown>).slug

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}/edit`)
    await page.waitForLoadState('networkidle')

    // Existing membership row should be visible — select has org pre-selected
    await expect(async () => {
      const selectedText = await page
        .locator('main .space-y-2 select')
        .first()
        .evaluate((el: HTMLSelectElement) => el.options[el.selectedIndex]?.text ?? '')
      expect(selectedText).toBe('Shire Watch')
    }).toPass({ timeout: 10000 })
    await page.click('button:has-text("Remove")')

    // Save
    await page.click('button[type="submit"]:has-text("Save")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/characters\/[^/]+$/)
      expect(page.url()).not.toContain('/edit')
    }).toPass({ timeout: 15000 })

    // Detail page should no longer show the org
    await expect(page.locator('[data-testid="character-organizations"]')).not.toContainText(
      'Shire Watch',
      { timeout: 10000 },
    )
  })
})
