import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Delete from UI', () => {
  test('6.1: DM can delete an entity from the detail page', async ({ page }) => {
    await registerAndLogin(page, 'Del Entity E2E')
    await createCampaign(page, `Del Ent Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Get entity type slug
    const types = (await apiFetch(page, `/api/campaigns/${campaignId}/entity-types`)) as {
      id: string
      slug: string
    }[]
    const typeSlug = types[0]?.slug

    const entity = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: `WikiPage ${uid()}`, type: typeSlug },
    })) as { slug: string }

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/entities/${entity.slug}`)
    await page.waitForLoadState('networkidle')

    // Delete button should be visible for DM
    const deleteBtn = page.locator('button:has-text("Delete")').first()
    await expect(deleteBtn).toBeVisible({ timeout: 10000 })

    // Accept confirm dialog and click delete
    page.once('dialog', (dialog) => dialog.accept())
    await deleteBtn.click()
    await page.waitForLoadState('networkidle')

    // Should redirect to entity list
    await expect(page).toHaveURL(/\/entities$/, { timeout: 10000 })

    // Navigating back to the entity should show not found
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/entities/${entity.slug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=not found').or(page.locator('text=Not Found'))).toBeVisible({
      timeout: 5000,
    })
  })

  test('6.2: DM can delete a character from the detail page', async ({ page }) => {
    await registerAndLogin(page, 'Del Char E2E')
    await createCampaign(page, `Del Char Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const char = (await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: { name: `Doomed ${uid()}`, characterType: 'npc' },
    })) as { slug: string }

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/characters/${char.slug}`)
    await page.waitForLoadState('networkidle')

    const deleteBtn = page.locator('button:has-text("Delete")').first()
    await expect(deleteBtn).toBeVisible({ timeout: 10000 })

    page.once('dialog', (dialog) => dialog.accept())
    await deleteBtn.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/characters$/, { timeout: 10000 })
  })

  test('6.3: DM can delete an organization from the detail page', async ({ page }) => {
    await registerAndLogin(page, 'Del Org E2E')
    await createCampaign(page, `Del Org Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const org = (await apiFetch(page, `/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      body: { name: `Doomed Guild ${uid()}`, type: 'guild', status: 'active' },
    })) as { slug: string }

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/organizations/${org.slug}`)
    await page.waitForLoadState('networkidle')

    const deleteBtn = page.locator('button:has-text("Delete")').first()
    await expect(deleteBtn).toBeVisible({ timeout: 10000 })

    page.once('dialog', (dialog) => dialog.accept())
    await deleteBtn.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/organizations$/, { timeout: 10000 })
  })

  test('6.4: editor does not see delete button on entity detail page', async ({ page }) => {
    await registerAndLogin(page, 'Del Editor E2E')
    await createCampaign(page, `Del Editor Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const types = (await apiFetch(page, `/api/campaigns/${campaignId}/entity-types`)) as {
      id: string
      slug: string
    }[]
    const typeSlug = types[0]?.slug

    const entity = (await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: `Protected ${uid()}`, type: typeSlug },
    })) as { slug: string }

    // Invite a second user as editor and get the join token
    const editorEmail = `editor-${Date.now()}@example.com`
    const invite = (await apiFetch(page, `/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      body: { email: editorEmail, role: 'editor' },
    })) as { token: string }

    // Register the editor user
    await page.goto('http://localhost:3333/register')
    await page.waitForSelector('form')
    await page.fill('#name', 'Editor User')
    await page.fill('#email', editorEmail)
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')

    // Join the campaign with the invite token
    await apiFetch(page, `/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: { token: invite.token },
    })

    await page.goto(`http://localhost:3333/campaigns/${campaignId}/entities/${entity.slug}`)
    await page.waitForLoadState('networkidle')

    // Delete button should NOT be visible for editor
    await expect(page.locator('button:has-text("Delete")').first()).not.toBeVisible({
      timeout: 5000,
    })
  })
})
