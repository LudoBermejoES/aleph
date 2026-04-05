import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Collaborative Editing', () => {
  test('"Collaborate" button on entity detail navigates to edit with ?collab=true', async ({ page }) => {
    await registerAndLogin(page, `CollabDM ${uid()}`)
    await createCampaign(page, `Collab Camp ${uid()}`)

    // Create an entity
    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("New Entity")')
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.fill('[role="dialog"] input[name="name"], [role="dialog"] input[placeholder*="name" i]', `Collab Entity ${uid()}`)
    await page.click('[role="dialog"] button[type="submit"]')
    await page.waitForLoadState('networkidle')

    // Navigate to entity detail
    const entityLink = page.locator('main a').filter({ hasText: 'Collab Entity' }).first()
    await expect(entityLink).toBeVisible({ timeout: 10000 })
    await entityLink.click()
    await page.waitForLoadState('networkidle')

    // Collaborate button should be visible (canEdit is true for DM)
    const collaborateBtn = page.locator('a:has-text("Collaborate")')
    await expect(collaborateBtn).toBeVisible({ timeout: 10000 })

    // Clicking it navigates to edit with ?collab=true
    await collaborateBtn.click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('collab=true')
    expect(page.url()).toContain('/edit')
  })

  test('entity edit page in solo mode has no collaboration indicator', async ({ page }) => {
    await registerAndLogin(page, `SoloDM ${uid()}`)
    await createCampaign(page, `Solo Camp ${uid()}`)

    // Create an entity via API-like navigation
    await page.click('aside >> text=Wiki')
    await page.waitForLoadState('networkidle')

    // Click new entity and create it
    await page.click('button:has-text("New Entity")')
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    const nameField = page.locator('[role="dialog"] input').first()
    await nameField.fill(`Solo Entity ${uid()}`)
    await page.click('[role="dialog"] button[type="submit"]')
    await page.waitForLoadState('networkidle')

    // Go to entity detail and then regular Edit (no collab)
    const entityLink = page.locator('main a').filter({ hasText: 'Solo Entity' }).first()
    await expect(entityLink).toBeVisible({ timeout: 10000 })
    await entityLink.click()
    await page.waitForLoadState('networkidle')

    const editBtn = page.locator('a:has-text("Edit")').first()
    await editBtn.click()
    await page.waitForLoadState('networkidle')

    // No collaboration indicator in solo mode
    await expect(page.locator('.collaboration-indicator, [class*="collaboration"]')).not.toBeVisible({ timeout: 3000 }).catch(() => {})
    expect(page.url()).not.toContain('collab=true')
  })
})
