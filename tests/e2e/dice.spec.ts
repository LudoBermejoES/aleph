import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Dice Roller', () => {
  test('dice roller panel opens and rolls', async ({ page }) => {
    await registerAndLogin(page, 'Dice Roller')
    await createCampaign(page, `Dice Camp ${uid()}`)

    // Click the floating dice button
    await page.click('button[title="Dice Roller"]')
    await page.waitForTimeout(500)

    // Panel should be visible
    await expect(page.locator('text=Dice Roller')).toBeVisible({ timeout: 5000 })

    // Click d20 quick roll
    await page.click('button:has-text("d20")')
    await page.waitForTimeout(1000)

    // Result should appear
    await expect(page.locator('.text-2xl')).toBeVisible({ timeout: 5000 })
  })

  test('formula input rolls dice', async ({ page }) => {
    await registerAndLogin(page, 'Formula Roller')
    await createCampaign(page, `Formula Camp ${uid()}`)

    await page.click('button[title="Dice Roller"]')
    await page.waitForTimeout(500)

    // Type formula and press Enter
    await page.fill('input[placeholder*="2d6"]', '2d6+4')
    await page.press('input[placeholder*="2d6"]', 'Enter')
    await page.waitForTimeout(1000)

    // Result should show
    await expect(page.locator('.text-2xl')).toBeVisible({ timeout: 5000 })
  })
})
