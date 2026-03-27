import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

// ─── Navigation ──────────────────────────────────────────────────────────────

test.describe('Locations navigation', () => {
  test('Locations link appears in campaign sidebar', async ({ page }) => {
    await registerAndLogin(page, 'Loc Nav User')
    await createCampaign(page, `Loc Nav Camp ${uid()}`)

    await expect(page.locator('aside >> text=Locations')).toBeVisible({ timeout: 10000 })
  })

  test('navigates to locations list page', async ({ page }) => {
    await registerAndLogin(page, 'Loc List User')
    await createCampaign(page, `Loc List Camp ${uid()}`)

    await page.click('aside >> text=Locations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main').getByRole('heading', { name: 'Locations' })).toBeVisible({ timeout: 10000 })
  })
})

// ─── Create ───────────────────────────────────────────────────────────────────

test.describe('Location creation', () => {
  test('can create a location and see it in the list', async ({ page }) => {
    await registerAndLogin(page, 'Loc Create User')
    await createCampaign(page, `Loc Create Camp ${uid()}`)

    await page.click('aside >> text=Locations')
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("New Location")')
    await page.waitForLoadState('networkidle')

    const locationName = `Barovia ${uid()}`
    await page.fill('input[placeholder*="location name" i]', locationName)

    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')

    // Should redirect to detail page
    await expect(page.locator('main h1')).toContainText(locationName, { timeout: 10000 })
  })

  test('can create a child location with parent', async ({ page }) => {
    await registerAndLogin(page, 'Loc Child User')
    const campaignId = await createCampaignAndGetId(page, `Loc Child Camp ${uid()}`)

    // Create parent via API
    const parentName = `Parent Region ${uid()}`
    await page.evaluate(async ([id, name]) => {
      await fetch(`/api/campaigns/${id}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subtype: 'region', visibility: 'members' }),
      })
    }, [campaignId, parentName])

    await page.goto(`/campaigns/${campaignId}/locations/new`)
    await page.waitForLoadState('networkidle')

    const childName = `Child Dungeon ${uid()}`
    await page.fill('input[placeholder*="location name" i]', childName)

    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main h1')).toContainText(childName, { timeout: 10000 })
  })
})

// ─── Detail page ─────────────────────────────────────────────────────────────

test.describe('Location detail page', () => {
  test('shows location details with edit button', async ({ page }) => {
    await registerAndLogin(page, 'Loc Detail User')
    const campaignId = await createCampaignAndGetId(page, `Loc Detail Camp ${uid()}`)

    const locName = `Castle Ravenloft ${uid()}`
    const locData: any = await page.evaluate(async ([id, name]) => {
      const res = await fetch(`/api/campaigns/${id}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subtype: 'dungeon', visibility: 'members', content: 'A dark castle.' }),
      })
      return res.json()
    }, [campaignId, locName])

    await page.goto(`/campaigns/${campaignId}/locations/${locData.slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main h1')).toContainText(locName, { timeout: 10000 })
    await expect(page.locator('main').getByText('dungeon')).toBeVisible()
    await expect(page.locator('main').getByText('A dark castle.')).toBeVisible()
    await expect(page.locator('main a:has-text("Edit")')).toBeVisible()
  })

  test('breadcrumb shows ancestors', async ({ page }) => {
    await registerAndLogin(page, 'Loc Ancestor User')
    const campaignId = await createCampaignAndGetId(page, `Loc Ancestor Camp ${uid()}`)

    const parent: any = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Barovia', subtype: 'region', visibility: 'members' }),
      })
      return res.json()
    }, campaignId)

    const child: any = await page.evaluate(async ([id, parentId]) => {
      const res = await fetch(`/api/campaigns/${id}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Village of Barovia', subtype: 'village', parentId, visibility: 'members' }),
      })
      return res.json()
    }, [campaignId, parent.id])

    await page.goto(`/campaigns/${campaignId}/locations/${child.slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main').getByRole('link', { name: 'Barovia' })).toBeVisible({ timeout: 10000 })
  })
})

// ─── Edit page ────────────────────────────────────────────────────────────────

test.describe('Location edit page', () => {
  test('can edit a location name', async ({ page }) => {
    await registerAndLogin(page, 'Loc Edit User')
    const campaignId = await createCampaignAndGetId(page, `Loc Edit Camp ${uid()}`)

    const loc: any = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Old Name', subtype: 'city', visibility: 'members' }),
      })
      return res.json()
    }, campaignId)

    await page.goto(`/campaigns/${campaignId}/locations/${loc.slug}/edit`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[placeholder*="location name" i]', 'New Name')
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main h1')).toContainText('New Name', { timeout: 10000 })
  })
})

// ─── Helper ───────────────────────────────────────────────────────────────────

async function createCampaignAndGetId(page: any, name: string): Promise<string> {
  await createCampaign(page, name)
  return page.url().split('/campaigns/')[1]?.split('/')[0] ?? ''
}
