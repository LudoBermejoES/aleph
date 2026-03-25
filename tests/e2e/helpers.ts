import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const BASE = 'http://localhost:3333'

/**
 * Wait for the page URL to match a pattern (works with SPA navigation).
 */
async function waitForSPANavigation(page: Page, pattern: string | RegExp, timeout = 15000) {
  await expect(async () => {
    const url = page.url()
    if (typeof pattern === 'string') {
      expect(url).toContain(pattern)
    } else {
      expect(url).toMatch(pattern)
    }
  }).toPass({ timeout })
}

/**
 * Register a new user and land on the home page (authenticated).
 * Returns the email used.
 */
export async function registerAndLogin(page: Page, name: string = 'E2E User'): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
  await page.goto(`${BASE}/register`)
  await page.waitForSelector('form', { timeout: 15000 })
  await page.fill('#name', name)
  await page.fill('#email', email)
  await page.fill('#password', 'testpassword123')
  await page.click('button[type="submit"]')
  // window.location.href = '/' causes full reload
  await page.waitForURL(`${BASE}/`, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  return email
}

/**
 * Create a campaign from the home page. Assumes user is authenticated.
 * Returns the campaign URL path.
 */
export async function createCampaign(page: Page, name: string): Promise<string> {
  await page.waitForSelector('button:has-text("New Campaign")', { timeout: 15000 })
  await page.click('button:has-text("New Campaign")')
  await page.waitForSelector('input[placeholder*="Curse"]', { timeout: 5000 })
  await page.fill('input[placeholder*="Curse"]', name)

  // Wait for Vue to process the fill
  await page.waitForTimeout(500)

  // Submit form
  await page.evaluate(() => {
    const form = document.querySelector('[role="dialog"] form') as HTMLFormElement
    if (form) form.requestSubmit()
  })

  // Wait for SPA navigation (navigateTo doesn't trigger 'load' event)
  await waitForSPANavigation(page, '/campaigns/')
  await page.waitForLoadState('networkidle')
  return new URL(page.url()).pathname
}
