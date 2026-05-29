import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('i18n fixes', () => {
  test('404 page shows Spanish text when locale cookie is es', async ({ page }) => {
    // Login first (app redirects unauthenticated users to /login)
    await registerAndLogin(page, `I18N ${uid()}`)

    // Set the i18n locale cookie to Spanish
    await page
      .context()
      .addCookies([
        { name: 'i18n_redirected', value: 'es', domain: new URL(BASE).hostname, path: '/' },
      ])

    await page
      .goto(`${BASE}/some/nonexistent/es-path-${uid()}`, { waitUntil: 'domcontentloaded' })
      .catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('text=404')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Página no encontrada')).toBeVisible()
    await expect(page.locator('text=Volver a Campañas')).toBeVisible()
  })

  test('404 page shows English text when locale cookie is en', async ({ page }) => {
    // Login first (app redirects unauthenticated users to /login)
    await registerAndLogin(page, `I18N EN ${uid()}`)

    await page
      .context()
      .addCookies([
        { name: 'i18n_redirected', value: 'en', domain: new URL(BASE).hostname, path: '/' },
      ])

    await page
      .goto(`${BASE}/some/nonexistent/en-path-${uid()}`, { waitUntil: 'domcontentloaded' })
      .catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('text=404')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Page not found')).toBeVisible()
    await expect(page.locator('text=Back to Campaigns')).toBeVisible()
  })
})
