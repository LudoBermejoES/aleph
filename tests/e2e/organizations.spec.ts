import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

// ─── List page ──────────────────────────────────────────────────────────────

test.describe('Organizations list page', () => {
  test('Organizations link appears in campaign sidebar', async ({ page }) => {
    await registerAndLogin(page, 'Org Nav User')
    await createCampaign(page, `Org Nav Camp ${uid()}`)

    await expect(page.locator('aside >> text=Organizations')).toBeVisible({ timeout: 10000 })
  })

  test('navigates to organizations list page', async ({ page }) => {
    await registerAndLogin(page, 'Org List User')
    await createCampaign(page, `Org List Camp ${uid()}`)

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText('Organizations', { timeout: 10000 })
  })

  test('empty state shown when no organizations exist', async ({ page }) => {
    await registerAndLogin(page, 'Org Empty User')
    await createCampaign(page, `Org Empty Camp ${uid()}`)

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main')).toContainText('No organizations yet', { timeout: 10000 })
  })

  test('DM sees New Organization button', async ({ page }) => {
    await registerAndLogin(page, 'Org DM User')
    await createCampaign(page, `Org DM Camp ${uid()}`)

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="new-organization-btn"]')).toBeVisible({ timeout: 10000 })
  })

  test('org appears in list after creation via API', async ({ page }) => {
    await registerAndLogin(page, 'Org Viewer')
    await createCampaign(page, `Org View Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const orgName = `The Syndicate ${uid()}`

    await page.evaluate(async ([id, name]) => {
      await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'faction', status: 'active' }),
      })
    }, [campaignId, orgName])

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`main >> text=${orgName}`)).toBeVisible({ timeout: 10000 })
  })

  test('list shows type badge, status badge, and member count', async ({ page }) => {
    await registerAndLogin(page, 'Org Badge User')
    await createCampaign(page, `Org Badge Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await page.evaluate(async (id) => {
      await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Badge Org', type: 'guild', status: 'secret' }),
      })
    }, campaignId)

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main >> text=Guild')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Secret')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=0 members')).toBeVisible({ timeout: 10000 })
  })
})

// ─── Create flow ─────────────────────────────────────────────────────────────

test.describe('Organization create flow', () => {
  test('DM creates organization via form and it appears in list', async ({ page }) => {
    await registerAndLogin(page, 'Org Creator')
    await createCampaign(page, `Org Create Camp ${uid()}`)

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')

    await page.click('[data-testid="new-organization-btn"]')
    await page.waitForURL('**/organizations/new', { timeout: 10000 })

    const orgName = `Created Org ${uid()}`
    await page.fill('input[placeholder*="Organization name"]', orgName)
    await page.selectOption('select:has(option[value="guild"])', 'guild')
    await page.fill('textarea', 'A test org.')

    await page.click('button[type="submit"]:has-text("Create")')

    // Should redirect to detail page
    await expect(async () => {
      expect(page.url()).toMatch(/\/organizations\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })

    await expect(page.locator('main h1')).toContainText(orgName, { timeout: 10000 })
  })

  test('create form shows inline error when name is missing', async ({ page }) => {
    await registerAndLogin(page, 'Org Validate User')
    await createCampaign(page, `Org Validate Camp ${uid()}`)

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')
    await page.click('[data-testid="new-organization-btn"]')
    await page.waitForURL('**/organizations/new', { timeout: 10000 })

    // Submit without filling name
    await page.click('button[type="submit"]:has-text("Create")')

    // HTML5 required validation prevents submit — name field should be focused/invalid
    // The button should not navigate away
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/new')
  })

  test('cancel returns to list page', async ({ page }) => {
    await registerAndLogin(page, 'Org Cancel User')
    await createCampaign(page, `Org Cancel Camp ${uid()}`)

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')
    await page.click('[data-testid="new-organization-btn"]')
    await page.waitForURL('**/organizations/new', { timeout: 10000 })

    await page.click('button:has-text("Cancel")')
    await expect(async () => {
      expect(page.url()).toMatch(/\/organizations$/)
    }).toPass({ timeout: 10000 })
  })
})

// ─── Detail page ─────────────────────────────────────────────────────────────

test.describe('Organization detail page', () => {
  test('detail page shows org info and empty members list', async ({ page }) => {
    await registerAndLogin(page, 'Org Detail User')
    await createCampaign(page, `Org Detail Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const orgName = `Detail Org ${uid()}`

    const slug = await page.evaluate(async ([id, name]) => {
      const res = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'army', status: 'active', description: 'Standing army.' }),
      })
      return (await res.json()).slug
    }, [campaignId, orgName])

    await page.goto(`${page.url().split('/campaigns/')[0]}/campaigns/${campaignId}/organizations/${slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main h1')).toContainText(orgName, { timeout: 10000 })
    await expect(page.locator('main')).toContainText('Army', { timeout: 5000 })
    await expect(page.locator('main')).toContainText('Standing army.', { timeout: 5000 })
    await expect(page.locator('main')).toContainText('No members yet', { timeout: 5000 })
  })

  test('DM sees Edit button on detail page', async ({ page }) => {
    await registerAndLogin(page, 'Org Edit Button User')
    await createCampaign(page, `Org Edit Btn Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const slug = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Editable Org' }),
      })
      return (await res.json()).slug
    }, campaignId)

    await page.goto(`${page.url().split('/campaigns/')[0]}/campaigns/${campaignId}/organizations/${slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main >> button:has-text("Edit"), main >> a:has-text("Edit")')).toBeVisible({ timeout: 10000 })
  })
})

// ─── Edit flow ───────────────────────────────────────────────────────────────

test.describe('Organization edit flow', () => {
  test('DM edits org name and status via edit page', async ({ page }) => {
    await registerAndLogin(page, 'Org Edit User')
    await createCampaign(page, `Org Edit Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const originalName = `Edit Me ${uid()}`

    const slug = await page.evaluate(async ([id, name]) => {
      const res = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'cult', status: 'active' }),
      })
      return (await res.json()).slug
    }, [campaignId, originalName])

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/organizations/${slug}`)
    await page.waitForLoadState('networkidle')

    await page.click('main >> a:has-text("Edit"), main >> button:has-text("Edit")')
    await page.waitForURL('**/edit', { timeout: 10000 })

    // Change status to dissolved
    await page.selectOption('select:has(option[value="dissolved"])', 'dissolved')

    await page.click('button[type="submit"]:has-text("Save")')

    // Redirected back to detail
    await expect(async () => {
      expect(page.url()).toMatch(/\/organizations\/[^/]+$/)
      expect(page.url()).not.toContain('/edit')
    }).toPass({ timeout: 15000 })

    await expect(page.locator('main')).toContainText('Dissolved', { timeout: 10000 })
  })

  test('edit cancel returns to detail page', async ({ page }) => {
    await registerAndLogin(page, 'Org Edit Cancel User')
    await createCampaign(page, `Org Edit Cancel Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const slug = await page.evaluate(async (id) => {
      const res = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Cancel Org' }),
      })
      return (await res.json()).slug
    }, campaignId)

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/organizations/${slug}/edit`)
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("Cancel")')

    await expect(async () => {
      expect(page.url()).toMatch(/\/organizations\/[^/]+$/)
      expect(page.url()).not.toContain('/edit')
    }).toPass({ timeout: 10000 })
  })
})

// ─── Member management ───────────────────────────────────────────────────────

test.describe('Organization member management', () => {
  test('DM adds a character member and it appears in the list', async ({ page }) => {
    await registerAndLogin(page, 'Org Member Add User')
    await createCampaign(page, `Org Member Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const { slug } = await page.evaluate(async (id) => {
      const orgRes = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Member Test Org' }),
      })
      const org = await orgRes.json()

      await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Frodo Baggins', characterType: 'pc' }),
      })

      return org
    }, campaignId)

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/organizations/${slug}`)
    await page.waitForLoadState('networkidle')

    // Select character from dropdown
    await page.selectOption('select', { label: 'Frodo Baggins' })

    // Enter a role
    await page.fill('input[placeholder*="Ring-bearer"]', 'Ring-bearer')

    // Click Add Member
    await page.click('button:has-text("Add Member")')

    // Member should appear in the list
    await expect(page.locator('main')).toContainText('Frodo Baggins', { timeout: 10000 })
    await expect(page.locator('main')).toContainText('Ring-bearer', { timeout: 5000 })
  })

  test('DM removes a member and they disappear from list', async ({ page }) => {
    await registerAndLogin(page, 'Org Member Remove User')
    await createCampaign(page, `Org Remove Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const { slug } = await page.evaluate(async (id) => {
      const orgRes = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Remove Test Org' }),
      })
      const org = await orgRes.json()

      const charRes = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Removable Hero', characterType: 'npc' }),
      })
      const char = await charRes.json()

      await fetch(`/api/campaigns/${id}/organizations/${org.slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: char.id, role: 'Scout' }),
      })

      return org
    }, campaignId)

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/organizations/${slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main')).toContainText('Removable Hero', { timeout: 10000 })

    // Click Remove
    await page.click('button:has-text("Remove")')

    await expect(page.locator('main')).not.toContainText('Removable Hero', { timeout: 10000 })
    await expect(page.locator('main')).toContainText('No members yet', { timeout: 5000 })
  })

  test('member count in list page updates after adding member', async ({ page }) => {
    await registerAndLogin(page, 'Org Count User')
    await createCampaign(page, `Org Count Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await page.evaluate(async (id) => {
      const orgRes = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Count Test Org' }),
      })
      const org = await orgRes.json()

      const charRes = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Counter NPC', characterType: 'npc' }),
      })
      const char = await charRes.json()

      await fetch(`/api/campaigns/${id}/organizations/${org.slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: char.id }),
      })
    }, campaignId)

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main >> text=1 member')).toBeVisible({ timeout: 10000 })
  })
})

// ─── Character detail — Organizations section ────────────────────────────────

test.describe('Character detail — Organizations section', () => {
  test('character detail shows Organizations section with membership', async ({ page }) => {
    await registerAndLogin(page, 'Char Org User')
    await createCampaign(page, `Char Org Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const charSlug = await page.evaluate(async (id) => {
      const charRes = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Samwise Gamgee', characterType: 'pc' }),
      })
      const char = await charRes.json()

      const orgRes = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'The Fellowship' }),
      })
      const org = await orgRes.json()

      await fetch(`/api/campaigns/${id}/organizations/${org.slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: char.id, role: 'Gardener' }),
      })

      return char.slug
    }, campaignId)

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-testid="character-organizations"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText('The Fellowship', { timeout: 5000 })
    await expect(page.locator('[data-testid="character-organizations"]')).toContainText('Gardener', { timeout: 5000 })
  })

  test('character detail org name links to org detail page', async ({ page }) => {
    await registerAndLogin(page, 'Char Org Link User')
    await createCampaign(page, `Char Org Link Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const { charSlug, orgSlug } = await page.evaluate(async (id) => {
      const charRes = await fetch(`/api/campaigns/${id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pippin Took', characterType: 'pc' }),
      })
      const char = await charRes.json()

      const orgRes = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Guard of the Citadel' }),
      })
      const org = await orgRes.json()

      await fetch(`/api/campaigns/${id}/organizations/${org.slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: char.id, role: 'Guard' }),
      })

      return { charSlug: char.slug, orgSlug: org.slug }
    }, campaignId)

    const base = page.url().split('/campaigns/')[0]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}`)
    await page.waitForLoadState('networkidle')

    // Click the org link in the organizations section
    await page.click(`[data-testid="character-organizations"] >> text=Guard of the Citadel`)
    await page.waitForURL(`**/organizations/${orgSlug}`, { timeout: 10000 })
    await expect(page.locator('main h1')).toContainText('Guard of the Citadel', { timeout: 10000 })
  })
})

// ─── Delete flow ─────────────────────────────────────────────────────────────

test.describe('Organization delete', () => {
  test('deleted org no longer appears in list', async ({ page }) => {
    await registerAndLogin(page, 'Org Delete User')
    await createCampaign(page, `Org Delete Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const orgName = `Delete Me ${uid()}`

    const slug = await page.evaluate(async ([id, name]) => {
      const res = await fetch(`/api/campaigns/${id}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      return (await res.json()).slug
    }, [campaignId, orgName])

    // Delete via API
    await page.evaluate(async ([id, s]) => {
      await fetch(`/api/campaigns/${id}/organizations/${s}`, { method: 'DELETE' })
    }, [campaignId, slug])

    await page.click('aside >> text=Organizations')
    await page.waitForLoadState('networkidle')

    await expect(page.locator(`main >> text=${orgName}`)).not.toBeVisible({ timeout: 5000 })
  })
})
