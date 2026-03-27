import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Autosave editor — draft recovery', () => {
  test('type in editor, reload page, restore banner appears, restore restores content', async ({ page }) => {
    await registerAndLogin(page, `Autosave User ${uid()}`)
    await createCampaign(page, `Autosave Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/characters/new`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

    // Type some content
    const draftText = `Draft content ${uid()}`
    await page.locator('.ProseMirror').click()
    await page.keyboard.type(draftText)

    // Wait for debounce to fire (1s) and write to localStorage
    await page.waitForTimeout(1500)

    // Verify something was stored in localStorage
    const storedKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => k.startsWith('aleph:draft:')),
    )
    expect(storedKeys.length).toBeGreaterThan(0)

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

    // Restore banner should appear
    await expect(page.locator('text=You have unsaved changes from a previous session.')).toBeVisible({ timeout: 5000 })

    // Click "Restore draft"
    await page.click('button:has-text("Restore draft")')

    // Banner should disappear
    await expect(page.locator('text=You have unsaved changes from a previous session.')).not.toBeVisible()

    // Content should be restored
    await expect(page.locator('.ProseMirror')).toContainText(draftText)
  })

  test('type in editor, reload page, discard removes banner and keeps empty content', async ({ page }) => {
    await registerAndLogin(page, `Autosave Discard ${uid()}`)
    await createCampaign(page, `Autosave Discard Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/characters/new`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

    await page.locator('.ProseMirror').click()
    await page.keyboard.type(`Discard me ${uid()}`)
    await page.waitForTimeout(1500)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

    // Banner appears
    await expect(page.locator('text=You have unsaved changes from a previous session.')).toBeVisible({ timeout: 5000 })

    // Click "Discard"
    await page.click('button:has-text("Discard")')

    // Banner disappears
    await expect(page.locator('text=You have unsaved changes from a previous session.')).not.toBeVisible()

    // localStorage key should be gone
    const storedKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => k.startsWith('aleph:draft:')),
    )
    expect(storedKeys.length).toBe(0)
  })

  test('save the form, reload page, no restore banner appears', async ({ page }) => {
    await registerAndLogin(page, `Autosave Save ${uid()}`)
    await createCampaign(page, `Autosave Save Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const base = page.url().split('/campaigns/')[0]

    await page.goto(`${base}/campaigns/${campaignId}/characters/new`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

    // Fill name (required) and some content
    await page.fill('input[placeholder*="Character name"]', `Hero ${uid()}`)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type(`Content to save ${uid()}`)
    await page.waitForTimeout(1500)

    // Save
    await page.click('button[type="submit"]')
    await expect(async () => {
      expect(page.url()).toMatch(/\/characters\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })

    // Navigate to the edit page
    const charSlug = page.url().split('/characters/')[1]
    await page.goto(`${base}/campaigns/${campaignId}/characters/${charSlug}/edit`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

    // No restore banner
    await expect(page.locator('text=You have unsaved changes from a previous session.')).not.toBeVisible()
  })
})
