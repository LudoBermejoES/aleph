/// <reference types="node" />
import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

// Minimal 1x1 red PNG as a buffer
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Image upload — toolbar button', () => {
  test('insert image via toolbar button appears in editor', async ({ page }) => {
    await registerAndLogin(page, `Img Toolbar User ${uid()}`)
    await createCampaign(page, `Img Toolbar Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const base = page.url().split('/campaigns/')[0]

    // Navigate directly to the new character page
    await page.goto(`${base}/campaigns/${campaignId}/characters/new`)
    await page.waitForLoadState('networkidle')

    // Wait for editor to initialise
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

    // The image toolbar button should be visible (campaignId is passed)
    const imageBtn = page.locator('button[title="Insert Image"]')
    await expect(imageBtn).toBeVisible({ timeout: 10000 })

    // Set up file chooser intercept before clicking
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      imageBtn.click(),
    ])

    // Upload the tiny PNG
    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })

    // An <img> node should appear in the editor
    await expect(page.locator('.ProseMirror img')).toBeVisible({ timeout: 15000 })

    // The src should point to the campaign images endpoint
    const src = await page.locator('.ProseMirror img').getAttribute('src')
    expect(src).toMatch(new RegExp(`/api/campaigns/${campaignId}/images/`))
  })
})

test.describe('Image upload — Markdown round-trip', () => {
  test('saved entity content reloads with image rendered', async ({ page }) => {
    await registerAndLogin(page, `Img Roundtrip User ${uid()}`)
    await createCampaign(page, `Img Roundtrip Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const base = page.url().split('/campaigns/')[0]

    // Navigate directly to the new character page
    await page.goto(`${base}/campaigns/${campaignId}/characters/new`)
    await page.waitForLoadState('networkidle')

    const charName = `Img Hero ${uid()}`
    await page.fill('input[placeholder*="Character name"]', charName)

    // Wait for editor
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

    // Upload image via toolbar
    const imageBtn = page.locator('button[title="Insert Image"]')
    await expect(imageBtn).toBeVisible({ timeout: 10000 })

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      imageBtn.click(),
    ])
    await fileChooser.setFiles({
      name: 'roundtrip.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })

    // Wait for img to appear in editor
    await expect(page.locator('.ProseMirror img')).toBeVisible({ timeout: 15000 })
    const uploadedSrc = await page.locator('.ProseMirror img').getAttribute('src')
    expect(uploadedSrc).toMatch(/\/api\/campaigns\/.+\/images\//)

    // Save the character
    await page.click('button[type="submit"]')
    await expect(async () => {
      expect(page.url()).toMatch(/\/characters\/[^/]+$/)
      expect(page.url()).not.toContain('/new')
    }).toPass({ timeout: 15000 })

    // Detail page should show the image
    await expect(page.locator('img[src*="/api/campaigns/"]')).toBeVisible({ timeout: 10000 })

    // Navigate to edit page and confirm img still present
    const charSlug = page.url().split('/characters/')[1]
    await page.goto(`${page.url().split('/characters/')[0]}/characters/${charSlug}/edit`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.ProseMirror img')).toBeVisible({ timeout: 10000 })
    const reloadedSrc = await page.locator('.ProseMirror img').getAttribute('src')
    expect(reloadedSrc).toBe(uploadedSrc)
  })
})
