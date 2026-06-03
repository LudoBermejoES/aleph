/// <reference types="node" />
import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

// Minimal 1x1 red PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Character portrait upload (CSRF)', () => {
  // Regression guard: the portrait upload must go through $fetch so the CSRF
  // plugin attaches X-CSRF-Token. A raw fetch() would 403 ("CSRF token mismatch")
  // and the portrait would never update. This drives the real CharacterPortrait.vue
  // UI to prove the multipart upload succeeds with CSRF.
  test('uploading a portrait via the UI succeeds (no CSRF 403)', async ({ page }) => {
    await registerAndLogin(page, `Portrait DM ${uid()}`)
    await createCampaign(page, `Portrait Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const base = page.url().split('/campaigns/')[0]

    // Create a character
    await page.goto(`${base}/campaigns/${campaignId}/characters/new`, {
      waitUntil: 'domcontentloaded',
    })
    const charName = `Portrait Hero ${uid()}`
    await page.fill('input[placeholder*="Character name"]', charName)
    await page.click('button[type="submit"]')
    await expect(async () => {
      expect(page.url()).toMatch(/\/characters\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })

    // Capture the POST /portrait response status to assert it is NOT a 403
    const portraitResponse = page.waitForResponse(
      (res) =>
        /\/characters\/[^/]+\/portrait$/.test(res.url()) && res.request().method() === 'POST',
      { timeout: 15000 },
    )

    // Upload via the hidden file input on the portrait (the CharacterPortrait.vue $fetch path)
    const fileInput = page.locator('input[type="file"][accept*="image"]').first()
    await fileInput.setInputFiles({
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })

    const res = await portraitResponse
    expect(res.status(), 'portrait upload must not be rejected by CSRF middleware').not.toBe(403)
    expect(res.status()).toBeLessThan(400)

    // The portrait <img> should point at the portrait endpoint (uploaded successfully)
    await expect(page.locator('img[src*="/portrait"]')).toBeVisible({ timeout: 10000 })
  })
})
