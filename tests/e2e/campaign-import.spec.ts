import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { registerAndLogin, apiFetch, BASE } from './helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Campaign Import', () => {
  test('Import Campaign button is visible on campaigns list', async ({ page }) => {
    await registerAndLogin(page, `ImportUser ${uid()}`)
    await page.waitForLoadState('networkidle')

    const importBtn = page.locator('button:has-text("Import Campaign")')
    await expect(importBtn).toBeVisible({ timeout: 10000 })
  })

  test('selecting a valid export JSON imports and redirects to new campaign', async ({ page }) => {
    await registerAndLogin(page, `ImportUser2 ${uid()}`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(`${BASE}/`, { timeout: 10000 })

    // Prepare fixture with unique name
    const fixture = JSON.parse(
      readFileSync(resolve(__dirname, '../fixtures/campaign-export-full.json'), 'utf-8'),
    )
    fixture.campaign.name = `E2E Import ${uid()}`

    // Write to a temp file that Playwright can use for file input
    const tmpPath = `/tmp/e2e-import-${Date.now()}.json`
    writeFileSync(tmpPath, JSON.stringify(fixture))

    // Set the file on the hidden input
    const fileInput = page.locator('input[type="file"][accept*=".json"]')
    await fileInput.setInputFiles(tmpPath)

    // Should navigate to the new campaign page
    await expect(async () => {
      expect(page.url()).toMatch(/\/campaigns\/[^/]+$/)
    }).toPass({ timeout: 30000 })

    await page.waitForLoadState('networkidle')
    // Campaign name should appear on the page
    await expect(page.locator('body')).toContainText(fixture.campaign.name, { timeout: 10000 })
  })

  test('importing an invalid JSON file shows error and stays on page', async ({ page }) => {
    await registerAndLogin(page, `ImportUser3 ${uid()}`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(`${BASE}/`, { timeout: 10000 })

    // Write a malformed (non-v1) JSON file
    const tmpPath = `/tmp/e2e-bad-import-${Date.now()}.json`
    writeFileSync(tmpPath, JSON.stringify({ version: '9.9', campaign: { id: 'x', name: 'Bad' } }))

    // Listen for alert dialog (error feedback)
    let alertMessage = ''
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message()
      await dialog.accept()
    })

    const fileInput = page.locator('input[type="file"][accept*=".json"]')
    await fileInput.setInputFiles(tmpPath)

    // Should remain on home page
    await page.waitForTimeout(3000)
    expect(page.url()).toBe(`${BASE}/`)
    expect(alertMessage).toMatch(/version|import/i)
  })

  test('imported campaign appears in campaigns list', async ({ page }) => {
    await registerAndLogin(page, `ImportUser4 ${uid()}`)
    await page.waitForLoadState('networkidle')

    const campaignName = `Listed Import ${uid()}`

    // Import via API directly to test the list appearance
    const fixture = JSON.parse(
      readFileSync(resolve(__dirname, '../fixtures/campaign-export-full.json'), 'utf-8'),
    )
    await apiFetch(page, '/api/campaigns/import', {
      method: 'POST',
      body: { ...fixture, campaign: { ...fixture.campaign, name: campaignName } },
    })

    // Reload and check list
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(campaignName, { timeout: 10000 })
  })
})
