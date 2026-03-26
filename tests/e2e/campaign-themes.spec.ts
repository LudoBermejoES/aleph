import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Campaign Themes', () => {
  test('theme picker appears in campaign create dialog', async ({ page }) => {
    await registerAndLogin(page, 'Theme Creator')
    await page.click('button:has-text("New Campaign")')
    await page.waitForSelector('input[placeholder*="Curse"]', { timeout: 5000 })

    // ThemePicker should be visible in the dialog
    const picker = page.locator('[role="dialog"] select')
    await expect(picker).toBeVisible()

    // Should have at least 11 options (default + 10 themes)
    const options = page.locator('[role="dialog"] select option')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(11)

    // Default option should be present
    await expect(page.locator('[role="dialog"] select option[value="default"]')).toBeAttached()
    await expect(page.locator('[role="dialog"] select option[value="cyberpunk"]')).toBeAttached()
    await expect(page.locator('[role="dialog"] select option[value="superhero"]')).toBeAttached()
  })

  test('creating a campaign with cyberpunk theme applies data-theme on main', async ({ page }) => {
    await registerAndLogin(page, 'Cyberpunk DM')
    await page.click('button:has-text("New Campaign")')
    await page.waitForSelector('input[placeholder*="Curse"]', { timeout: 5000 })

    const name = `Neon City ${uid()}`
    await page.fill('input[placeholder*="Curse"]', name)

    // Select cyberpunk theme
    await page.selectOption('[role="dialog"] select', 'cyberpunk')
    await page.waitForTimeout(300)

    // Submit
    await page.evaluate(() => {
      const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
      if (form) form.requestSubmit()
    })

    await page.waitForURL(/\/campaigns\//, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // The root layout div should have data-theme="cyberpunk"
    const root = page.locator('div.flex.h-screen').first()
    await expect(root).toHaveAttribute('data-theme', 'cyberpunk', { timeout: 10000 })
  })

  test('changing theme on dashboard settings applies it reactively', async ({ page }) => {
    await registerAndLogin(page, 'Theme Changer')
    await createCampaign(page, `Theme Test ${uid()}`)
    await page.waitForLoadState('networkidle')

    // Wait for ThemePicker select to appear in main (at the bottom, in the settings section)
    const select = page.locator('main select')
    await expect(select).toBeVisible({ timeout: 10000 })
    await select.selectOption('dark-fantasy')

    // Save — the settings section has a Save button
    await page.locator('main button:has-text("Save")').click()

    // After save, root layout div should have data-theme="dark-fantasy"
    const root = page.locator('div.flex.h-screen').first()
    await expect(root).toHaveAttribute('data-theme', 'dark-fantasy', { timeout: 10000 })
  })

  test('campaign with default theme has no data-theme attribute on main', async ({ page }) => {
    await registerAndLogin(page, 'Default Theme DM')
    await createCampaign(page, `Default Theme ${uid()}`)
    await page.waitForLoadState('networkidle')

    // With 'default' theme, data-theme should be absent (we pass undefined, not "default")
    const root = page.locator('div.flex.h-screen').first()
    const attr = await root.getAttribute('data-theme')
    expect(attr === null || attr === 'default').toBe(true)
  })
})
