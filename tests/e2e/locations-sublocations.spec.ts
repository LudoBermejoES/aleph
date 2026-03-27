import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

async function setup(page: any, label: string) {
  await registerAndLogin(page, label)
  await createCampaign(page, `SubLoc E2E ${uid()}`)
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

// ─── Via UI "+" link on detail page ──────────────────────────────────────────

test('detail page "+ Sub-location" link pre-fills parent in new form', async ({ page }) => {
  const campaignId = await setup(page, 'SubLoc Link User')

  const parent: any = await createLocationViaApi(page, campaignId, {
    name: 'Barovia', subtype: 'region', visibility: 'members',
  })

  await page.goto(`/campaigns/${campaignId}/locations/${parent.slug}`)
  await page.waitForLoadState('networkidle')

  // Click the "+ Sub-location" inline link and wait for navigation to /locations/new
  await Promise.all([
    page.waitForURL(/\/locations\/new/, { timeout: 10000 }),
    page.locator('a', { hasText: '+ Sub-location' }).click(),
  ])

  // The URL should contain ?parentId=<parent.id>
  expect(page.url()).toContain(`parentId=${parent.id}`)

  // Wait for locations to load and the parent select to be pre-populated
  await page.waitForFunction(
    (parentId: string) => {
      const selects = document.querySelectorAll('select')
      for (const sel of selects) {
        if (sel.value === parentId) return true
      }
      return false
    },
    parent.id,
    { timeout: 10000 },
  )
})

test('creating a sub-location via the form creates it under the correct parent', async ({ page }) => {
  const campaignId = await setup(page, 'SubLoc Create User')

  const parent: any = await createLocationViaApi(page, campaignId, {
    name: 'The Kingdom', subtype: 'country', visibility: 'members',
  })

  await page.goto(`/campaigns/${campaignId}/locations/new?parentId=${parent.id}`)
  await page.waitForLoadState('networkidle')

  const childName = `Capital City ${uid()}`
  await page.fill('input[placeholder*="location name" i]', childName)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')

  // Should redirect to detail page of the new child
  await expect(page.locator('main h1')).toContainText(childName, { timeout: 10000 })

  // Breadcrumb should include the parent
  await expect(page.locator('main').getByRole('link', { name: 'The Kingdom' })).toBeVisible({ timeout: 10000 })
})

test('child location appears in parent sub-locations section', async ({ page }) => {
  const campaignId = await setup(page, 'SubLoc Panel User')

  const parent: any = await createLocationViaApi(page, campaignId, {
    name: 'Dark Forest', subtype: 'wilderness', visibility: 'members',
  })
  await createLocationViaApi(page, campaignId, {
    name: 'Forest Clearing', subtype: 'wilderness', parentId: parent.id, visibility: 'members',
  })
  await createLocationViaApi(page, campaignId, {
    name: "Witch's Hut", subtype: 'building', parentId: parent.id, visibility: 'members',
  })

  await page.goto(`/campaigns/${campaignId}/locations/${parent.slug}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('main').getByText('Forest Clearing')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('main').getByText("Witch's Hut")).toBeVisible({ timeout: 10000 })
})

test('child detail page breadcrumb links back to parent', async ({ page }) => {
  const campaignId = await setup(page, 'SubLoc Breadcrumb User')

  const parent: any = await createLocationViaApi(page, campaignId, {
    name: 'Ravenloft Castle', subtype: 'dungeon', visibility: 'members',
  })
  const child: any = await createLocationViaApi(page, campaignId, {
    name: 'Throne Room', subtype: 'room', parentId: parent.id, visibility: 'members',
  })

  await page.goto(`/campaigns/${campaignId}/locations/${child.slug}`)
  await page.waitForLoadState('networkidle')

  const ancestorLink = page.locator('main').getByRole('link', { name: 'Ravenloft Castle' })
  await expect(ancestorLink).toBeVisible({ timeout: 10000 })

  // Clicking the ancestor link navigates to the parent
  await ancestorLink.click()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main h1')).toContainText('Ravenloft Castle', { timeout: 10000 })
})

test('3-level nesting: grandchild breadcrumb shows full ancestor chain', async ({ page }) => {
  const campaignId = await setup(page, 'SubLoc Deep User')

  const grandparent: any = await createLocationViaApi(page, campaignId, {
    name: 'The Empire', subtype: 'country', visibility: 'members',
  })
  const parent2: any = await createLocationViaApi(page, campaignId, {
    name: 'Northern Province', subtype: 'region', parentId: grandparent.id, visibility: 'members',
  })
  const grandchild: any = await createLocationViaApi(page, campaignId, {
    name: 'Border Town', subtype: 'town', parentId: parent2.id, visibility: 'members',
  })

  await page.goto(`/campaigns/${campaignId}/locations/${grandchild.slug}`)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('main').getByRole('link', { name: 'The Empire' })).toBeVisible({ timeout: 10000 })
  await expect(page.locator('main').getByRole('link', { name: 'Northern Province' })).toBeVisible({ timeout: 10000 })
})
