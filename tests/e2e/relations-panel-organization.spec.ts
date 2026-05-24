import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-5)

test.describe('Relations panel — organization detail page', () => {
  test('panel renders with empty state when org has no relations or members', async ({ page }) => {
    await registerAndLogin(page, 'Org Panel User')
    await createCampaign(page, `Org Panel Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const org = await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'Empty Guild', type: 'guild' },
    })
    const slug = (org as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/organizations/${slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })
    await expect(page.locator('button:has-text("Add Relation")')).toBeVisible({ timeout: 5000 })
  })

  test('panel shows Members section with existing members', async ({ page }) => {
    await registerAndLogin(page, 'Org Members Panel User')
    await createCampaign(page, `Org Members Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const org = await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'Members Guild', type: 'faction' },
    })
    const char = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Guild Knight', characterType: 'npc' },
    })
    await apiFetch(
      page,
      `/api/campaigns/${campaignId}/organizations/${(org as Record<string, unknown>).slug}/members`,
      {
        method: 'POST',
        body: { characterId: (char as Record<string, unknown>).id, role: 'Knight' },
      },
    )

    const slug = (org as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/organizations/${slug}`)
    await page.waitForLoadState('networkidle')

    // Panel should show MEMBERS group header and member name
    await expect(page.locator('main')).toContainText('Guild Knight', { timeout: 10000 })
    await expect(page.locator('main')).toContainText('Knight', { timeout: 5000 })
    await expect(page.locator('main button:has-text("Edit")')).toBeVisible({ timeout: 5000 })
  })

  test('DM can update a member role via the panel Edit button', async ({ page }) => {
    await registerAndLogin(page, 'Org Role Edit User')
    await createCampaign(page, `Org Role Edit Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const org = await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'Role Guild', type: 'faction' },
    })
    const char = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Role Member', characterType: 'npc' },
    })
    await apiFetch(
      page,
      `/api/campaigns/${campaignId}/organizations/${(org as Record<string, unknown>).slug}/members`,
      {
        method: 'POST',
        body: { characterId: (char as Record<string, unknown>).id, role: 'Squire' },
      },
    )

    const slug = (org as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/organizations/${slug}`)
    await page.waitForLoadState('networkidle')

    // Wait for member to appear
    await expect(page.locator('main')).toContainText('Role Member', { timeout: 10000 })

    // Click Edit on the member row (inside panel)
    await page.click('main button:has-text("Edit")')

    // Edit Member Role dialog should open
    await page.waitForSelector('[role="dialog"]:has-text("Edit Member Role")', { timeout: 5000 })

    // Clear and fill new role
    const roleInput = page.locator('[role="dialog"] input')
    await roleInput.clear()
    await roleInput.fill('Commander')

    await page.click('[role="dialog"] button:has-text("Save")')

    // Panel should now show updated role
    await expect(page.locator('main')).toContainText('Commander', { timeout: 10000 })
    await expect(page.locator('main')).not.toContainText('Squire', { timeout: 5000 })
  })

  test('DM can remove a member via the panel Delete button', async ({ page }) => {
    await registerAndLogin(page, 'Org Member Del User')
    await createCampaign(page, `Org Member Del Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const org = await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: 'Del Guild', type: 'faction' },
    })
    const char = await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: 'Remove Knight', characterType: 'npc' },
    })
    await apiFetch(
      page,
      `/api/campaigns/${campaignId}/organizations/${(org as Record<string, unknown>).slug}/members`,
      {
        method: 'POST',
        body: { characterId: (char as Record<string, unknown>).id, role: 'Knight' },
      },
    )

    const slug = (org as Record<string, unknown>).slug as string
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/organizations/${slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main')).toContainText('Remove Knight', { timeout: 10000 })

    // Click Delete button in panel
    await page.click('main button:has-text("Delete")')
    await page.click('[role="alertdialog"] button:has-text("Delete")')

    // Member should be gone, panel shows empty state
    await expect(page.locator('main')).toContainText('No relations yet.', { timeout: 10000 })
    await expect(page.locator('main')).not.toContainText('Remove Knight', { timeout: 5000 })
  })
})
