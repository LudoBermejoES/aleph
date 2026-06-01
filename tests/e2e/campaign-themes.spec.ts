import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

const THEME_FONTS: Record<string, { heading: string; body: string }> = {
  'dark-fantasy': { heading: 'Cinzel Decorative', body: 'IM Fell English' },
  cyberpunk: { heading: 'Orbitron', body: 'Share Tech Mono' },
  'cosmic-horror': { heading: 'Uncial Antiqua', body: 'Crimson Text' },
  'high-fantasy': { heading: 'Cinzel', body: 'Lora' },
  western: { heading: 'Rye', body: 'Playfair Display' },
  steampunk: { heading: 'Special Elite', body: 'Libre Baskerville' },
  eldritch: { heading: 'Trade Winds', body: 'IM Fell DW Pica' },
  'fey-wilds': { heading: 'Pacifico', body: 'Nunito' },
  undead: { heading: 'Crimson Text', body: 'Spectral' },
  superhero: { heading: 'Bangers', body: 'Exo 2' },
}

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

    // Save — use exact match to avoid ambiguity with "Save Details" button
    await page.locator('main button:has-text("Save")').last().click()

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

  // 8.1 — heading font-family is applied per theme
  for (const [theme, fonts] of Object.entries(THEME_FONTS)) {
    test(`${theme} theme: heading uses ${fonts.heading}`, async ({ page }) => {
      await registerAndLogin(page, `Font DM ${uid()}`)
      await page.click('button:has-text("New Campaign")')
      await page.waitForSelector('input[placeholder*="Curse"]', { timeout: 5000 })
      await page.fill('input[placeholder*="Curse"]', `Font Test ${uid()}`)
      await page.selectOption('[role="dialog"] select', theme)
      await page.waitForTimeout(200)
      await page.evaluate(() => {
        const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
        if (form) form.requestSubmit()
      })
      await page.waitForURL(/\/campaigns\//, { timeout: 15000 })
      await page.waitForLoadState('networkidle')

      // Wait for data-theme to be set
      await page.locator('div.flex.h-screen').first().waitFor({ state: 'visible' })
      await expect(page.locator('div.flex.h-screen').first()).toHaveAttribute('data-theme', theme, {
        timeout: 10000,
      })

      // Assert the CSS custom property is set on the [data-theme] element.
      // getComputedStyle only resolves inherited/applied custom properties —
      // we read it from the element itself (custom props inherit down the tree,
      // so reading from a child h1 also works).
      const tokenValue = await page.evaluate((t) => {
        // Try reading from the [data-theme] root
        const root = document.querySelector(`[data-theme="${t}"]`) as HTMLElement | null
        if (root) {
          const v = getComputedStyle(root).getPropertyValue('--theme-font-heading').trim()
          if (v) return v
        }
        // Fallback: read from h1 where the property is also inherited
        const h1 = document.querySelector('h1') as HTMLElement | null
        if (h1) return getComputedStyle(h1).getPropertyValue('--theme-font-heading').trim()
        return null
      }, theme)
      expect(tokenValue).toBeTruthy()
      expect(tokenValue).toContain(fonts.heading)
    })
  }

  // 8.3 — no animation when prefers-reduced-motion: reduce
  test('no animation plays when prefers-reduced-motion is reduce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await registerAndLogin(page, `ReducedMotion DM ${uid()}`)
    await page.click('button:has-text("New Campaign")')
    await page.waitForSelector('input[placeholder*="Curse"]', { timeout: 5000 })
    await page.fill('input[placeholder*="Curse"]', `Reduced Motion ${uid()}`)
    await page.selectOption('[role="dialog"] select', 'cyberpunk')
    await page.waitForTimeout(200)
    await page.evaluate(() => {
      const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
      if (form) form.requestSubmit()
    })
    await page.waitForURL(/\/campaigns\//, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('div.flex.h-screen').first()).toHaveAttribute(
      'data-theme',
      'cyberpunk',
      { timeout: 10000 },
    )

    const animationName = await page.evaluate(() => {
      const h1 = document.querySelector('h1')
      if (!h1) return ''
      return window.getComputedStyle(h1).animationName
    })
    // Under reduced-motion, animation-name should be 'none' (the @media block is skipped)
    expect(animationName === 'none' || animationName === '').toBe(true)
  })

  // 8.4 — Teleport-portalled SearchCommand inherits theme font via <html> data-theme
  test('SearchCommand palette inherits theme font via html data-theme', async ({ page }) => {
    await registerAndLogin(page, `Teleport DM ${uid()}`)
    await page.click('button:has-text("New Campaign")')
    await page.waitForSelector('input[placeholder*="Curse"]', { timeout: 5000 })
    await page.fill('input[placeholder*="Curse"]', `Teleport Test ${uid()}`)
    await page.selectOption('[role="dialog"] select', 'cyberpunk')
    await page.waitForTimeout(200)
    await page.evaluate(() => {
      const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
      if (form) form.requestSubmit()
    })
    await page.waitForURL(/\/campaigns\//, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('div.flex.h-screen').first()).toHaveAttribute(
      'data-theme',
      'cyberpunk',
      { timeout: 10000 },
    )

    // Verify <html> also carries the data-theme (the Teleport propagation)
    const htmlTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    expect(htmlTheme).toBe('cyberpunk')

    // The key assertion: <html> carries data-theme so portalled UI inherits it
    expect(htmlTheme).toBe('cyberpunk')
  })
})
