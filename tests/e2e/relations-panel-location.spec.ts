import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-5)

test.describe('Relations panel — location detail page', () => {
  test('panel renders with empty state when location has no relations', async ({ page }) => {
    await registerAndLogin(page, 'Loc Panel User')
    await createCampaign(page, `Loc Panel Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const loc = await apiFetch(page, `/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      body: { name: 'Empty Town', subtype: 'town' },
    })
    const slug = (loc as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/locations/${slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })
    await expect(page.locator('button:has-text("Add Relation")')).toBeVisible({ timeout: 5000 })
  })

  test('panel shows Inhabitants section with linked characters', async ({ page }) => {
    await registerAndLogin(page, 'Loc Inh User')
    await createCampaign(page, `Loc Inh Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const loc = await apiFetch(page, `/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      body: { name: 'Inhabited Town', subtype: 'town' },
    })
    const char = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Town Resident', characterType: 'npc' },
    })

    const locSlug = (loc as Record<string, unknown>).slug as string
    await apiFetch(page, `/api/campaigns/${campaignId}/locations/${locSlug}/inhabitants`, {
      method: 'POST',
      body: { characterId: (char as Record<string, unknown>).id },
    })

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/locations/${locSlug}`)
    await page.waitForLoadState('networkidle')

    // Panel should show Inhabitants group header and character name
    await expect(page.locator('main')).toContainText('Town Resident', { timeout: 10000 })
    await expect(page.locator('main button:has-text("Delete")')).toBeVisible({ timeout: 5000 })
  })

  test('panel shows Organizations section with linked orgs', async ({ page }) => {
    await registerAndLogin(page, 'Loc Org User')
    await createCampaign(page, `Loc Org Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const loc = await apiFetch(page, `/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      body: { name: 'Org Town', subtype: 'town' },
    })
    const org = await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'Town Guild', type: 'guild' },
    })

    const locSlug = (loc as Record<string, unknown>).slug as string
    await apiFetch(page, `/api/campaigns/${campaignId}/locations/${locSlug}/organizations`, {
      method: 'POST',
      body: { organizationId: (org as Record<string, unknown>).id },
    })

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/locations/${locSlug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main')).toContainText('Town Guild', { timeout: 10000 })
    await expect(page.locator('main button:has-text("Delete")')).toBeVisible({ timeout: 5000 })
  })

  test('DM can remove an inhabitant via the panel Delete button', async ({ page }) => {
    await registerAndLogin(page, 'Loc Inh Del User')
    await createCampaign(page, `Loc Inh Del Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const loc = await apiFetch(page, `/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      body: { name: 'Delete Town', subtype: 'town' },
    })
    const char = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Evicted Resident', characterType: 'npc' },
    })

    const locSlug = (loc as Record<string, unknown>).slug as string
    await apiFetch(page, `/api/campaigns/${campaignId}/locations/${locSlug}/inhabitants`, {
      method: 'POST',
      body: { characterId: (char as Record<string, unknown>).id },
    })

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/locations/${locSlug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main')).toContainText('Evicted Resident', { timeout: 10000 })

    await page.click('main button:has-text("Delete")')
    await page.click('[role="alertdialog"] button:has-text("Delete")')

    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })
    await expect(page.locator('main')).not.toContainText('Evicted Resident', { timeout: 5000 })
  })

  test('DM can remove an organization link via the panel Delete button', async ({ page }) => {
    await registerAndLogin(page, 'Loc Org Del User')
    await createCampaign(page, `Loc Org Del Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const loc = await apiFetch(page, `/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      body: { name: 'Unlinked Town', subtype: 'town' },
    })
    const org = await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'Departing Guild', type: 'guild' },
    })

    const locSlug = (loc as Record<string, unknown>).slug as string
    await apiFetch(page, `/api/campaigns/${campaignId}/locations/${locSlug}/organizations`, {
      method: 'POST',
      body: { organizationId: (org as Record<string, unknown>).id },
    })

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/locations/${locSlug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main')).toContainText('Departing Guild', { timeout: 10000 })

    await page.click('main button:has-text("Delete")')
    await page.click('[role="alertdialog"] button:has-text("Delete")')

    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })
    await expect(page.locator('main')).not.toContainText('Departing Guild', { timeout: 5000 })
  })
})
