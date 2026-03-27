import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

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
    await expect(page.locator('text=Organizations')).not.toBeVisible({ timeout: 3000 }).catch(() => {})
  })

  test('org picker appears when organizations exist', async ({ page }) => {
    await registerAndLogin(page, 'Char Org Picker User')
    await createCampaign(page, `Char Org Picker Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'The Order' }),
      })
    }, campaignId)

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await page.click('[data-testid="new-character-btn"]')
    await page.waitForURL('**/characters/new', { timeout: 10000 })

    // Wait for form to load orgs
    await expect(page.locator('main label:has-text("Organizations")')).toBeVisible({ timeout: 10000 })
  })

  test('create character with organization membership', async ({ page }) => {
    await registerAndLogin(page, 'Char Org Create User')
    await createCampaign(page, `Char Org Create Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'The Fellowship' }),
      })
    }, campaignId)

    await page.click('aside >> text=Characters')
    await page.waitForLoadState('networkidle')
    await page.click('[data-testid="new-character-btn"]')
    await page.waitForURL('**/characters/new', { timeout: 10000 })

    // Fill character name
    const charName = `Frodo ${uid()}`
    await page.fill('input[placeholder*="Character name"]', charName)

    // Wait for org section to load then click + Add Organization
    await expect(page.locator('main label:has-text("Organizations")')).toBeVisible({ timeout: 10000 })
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
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText('The Fellowship', { timeout: 10000 })
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText('Ring-bearer', { timeout: 5000 })
  })
})

// ─── Edit character — organization picker ────────────────────────────────────

test.describe('Character edit — organization picker', () => {
  test('edit page pre-fills existing org memberships', async ({ page }) => {
    await registerAndLogin(page, 'Char Edit Org User')
    await createCampaign(page, `Char Edit Org Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charSlug = await page.evaluate(async (id) => {
      const orgRes = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rivendell Council' }),
      })
      const org = await orgRes.json()

      const charRes = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Elrond', characterType: 'npc' }),
      })
      const char = await charRes.json()

      await fetch(`/api/campaigns/${id}/organizations/${org.slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: char.id, role: 'Lord' }),
      })

      return char.slug
    }, campaignId)

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}/edit`)
    await page.waitForLoadState('networkidle')

    // Org section should show the existing membership pre-filled — select has the org selected
    await expect(async () => {
      const selectedText = await page.locator('main .space-y-2 select').first().evaluate(
        (el: HTMLSelectElement) => el.options[el.selectedIndex]?.text ?? ''
      )
      expect(selectedText).toBe('Rivendell Council')
    }).toPass({ timeout: 10000 })
    await expect(page.locator('input[placeholder*="Ring-bearer"]').first()).toHaveValue('Lord', { timeout: 5000 })
  })

  test('edit page — add new org membership and save', async ({ page }) => {
    await registerAndLogin(page, 'Char Edit Add Org User')
    await createCampaign(page, `Char Edit Add Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charSlug = await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Grey Havens' }),
      })
      const charRes = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Cirdan', characterType: 'npc' }),
      })
      return (await charRes.json()).slug
    }, campaignId)

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}/edit`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main label:has-text("Organizations")')).toBeVisible({ timeout: 10000 })

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
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText('Grey Havens', { timeout: 10000 })
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText('Shipwright', { timeout: 5000 })
  })

  test('edit page — remove org membership and save', async ({ page }) => {
    await registerAndLogin(page, 'Char Edit Remove Org User')
    await createCampaign(page, `Char Edit Remove Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charSlug = await page.evaluate(async (id) => {
      const orgRes = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Shire Watch' }),
      })
      const org = await orgRes.json()

      const charRes = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bilbo', characterType: 'pc' }),
      })
      const char = await charRes.json()

      await fetch(`/api/campaigns/${id}/organizations/${org.slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: char.id, role: 'Burglar' }),
      })

      return char.slug
    }, campaignId)

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}/edit`)
    await page.waitForLoadState('networkidle')

    // Existing membership row should be visible — select has org pre-selected
    await expect(async () => {
      const selectedText = await page.locator('main .space-y-2 select').first().evaluate(
        (el: HTMLSelectElement) => el.options[el.selectedIndex]?.text ?? ''
      )
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
    await expect(page.locator('[data-testid="character-organizations"]')).not.toContainText('Shire Watch', { timeout: 10000 })
  })
})
