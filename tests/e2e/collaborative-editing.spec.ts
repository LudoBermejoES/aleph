import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Collaborative Editing', () => {
  // Task 9.5: "Collaborate" button on entity detail navigates to edit with ?collab=true
  test('"Collaborate" button on entity detail navigates to edit with ?collab=true', async ({ page }) => {
    await registerAndLogin(page, `CollabDM ${uid()}`)
    await createCampaign(page, `Collab Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const entityName = `Collab Entity ${uid()}`

    // Create entity via API
    await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: entityName, type: 'location', content: '# Test' },
    })

    // Navigate to entity detail
    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')
    await page.click(`main >> text=${entityName}`)
    await page.waitForURL('**/entities/**', { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // "Collaborate" button should be visible for DM (canEdit=true)
    const collaborateBtn = page.locator('a:has-text("Collaborate")')
    await expect(collaborateBtn).toBeVisible({ timeout: 10000 })

    // Clicking navigates to edit with ?collab=true
    await collaborateBtn.click()
    await expect(async () => {
      expect(page.url()).toContain('collab=true')
      expect(page.url()).toContain('/edit')
    }).toPass({ timeout: 10000 })
  })

  // Task 9.5: regular "Edit" button does NOT include ?collab param
  test('"Edit" button on entity detail navigates to edit without ?collab param', async ({ page }) => {
    await registerAndLogin(page, `SoloDM ${uid()}`)
    await createCampaign(page, `Solo Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const entityName = `Solo Entity ${uid()}`

    await apiFetch(page, `/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      body: { name: entityName, type: 'location', content: '# Test' },
    })

    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')
    await page.click(`main >> text=${entityName}`)
    await page.waitForURL('**/entities/**', { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // Regular Edit button (first one, not Collaborate)
    const editBtn = page.locator('a:has-text("Edit")').first()
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()
    await expect(async () => {
      expect(page.url()).toContain('/edit')
      expect(page.url()).not.toContain('collab=true')
    }).toPass({ timeout: 10000 })
  })
})
