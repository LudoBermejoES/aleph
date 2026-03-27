import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

async function setup(page: any, label: string) {
  await registerAndLogin(page, label)
  await createCampaign(page, `Subtype E2E ${uid()}`)
  return page.url().split('/campaigns/')[1]?.split('/')[0] ?? ''
}

async function createLocationViaApi(page: any, campaignId: string, body: Record<string, unknown>) {
  return page.evaluate(async ([id, data]: [string, Record<string, unknown>]) => {
    const res = await fetch(`/api/campaigns/${id}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  }, [campaignId, body])
}

test('detail page shows correct subtype, not "Other"', async ({ page }) => {
  const campaignId = await setup(page, 'Subtype Detail User')

  const loc: any = await createLocationViaApi(page, campaignId, {
    name: 'Barovia', subtype: 'region', visibility: 'members',
  })

  await page.goto(`/campaigns/${campaignId}/locations/${loc.slug}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('main h1')).toContainText('Barovia', { timeout: 10000 })
  // Should show "Region", not "Other"
  await expect(page.locator('main').getByText('Region', { exact: false })).toBeVisible({ timeout: 10000 })
  await expect(page.locator('main').getByText('Other', { exact: true })).not.toBeVisible()
})

test('list page shows correct subtype badge, not "Other"', async ({ page }) => {
  const campaignId = await setup(page, 'Subtype List User')

  await createLocationViaApi(page, campaignId, { name: 'The Kingdom', subtype: 'country', visibility: 'members' })
  await createLocationViaApi(page, campaignId, { name: 'Dark Dungeon', subtype: 'dungeon', visibility: 'members' })

  await page.goto(`/campaigns/${campaignId}/locations`)
  await page.waitForLoadState('networkidle')

  // Should see "Country" and "Dungeon" badges (spans), not "Other"
  await expect(page.locator('main span.capitalize', { hasText: 'Country' }).first()).toBeVisible({ timeout: 10000 })
  await expect(page.locator('main span.capitalize', { hasText: 'Dungeon' }).first()).toBeVisible({ timeout: 10000 })
})

test('subtype is preserved after editing a location', async ({ page }) => {
  const campaignId = await setup(page, 'Subtype Edit User')

  const loc: any = await createLocationViaApi(page, campaignId, {
    name: 'The City', subtype: 'city', visibility: 'members',
  })

  await page.goto(`/campaigns/${campaignId}/locations/${loc.slug}/edit`)
  await page.waitForLoadState('networkidle')

  // Change name only, leave subtype
  await page.fill('input[placeholder*="location name" i]', 'The Great City')
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')

  await expect(page.locator('main h1')).toContainText('The Great City', { timeout: 10000 })
  // Subtype span should show "City", not "Other"
  await expect(page.locator('main span.capitalize', { hasText: /^City$/ })).toBeVisible({ timeout: 10000 })
  await expect(page.locator('main span.capitalize', { hasText: /^Other$/ })).not.toBeVisible()
})
