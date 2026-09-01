import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Where the suite points. Defaults to 3333 exactly as before; `E2E_PORT` / `E2E_BASE_URL`
 * exist because another project's dev server on 3333 silently hijacks the run, and the fix
 * has to be "point somewhere else", not "kill the other server".
 * A server started on a non-default port needs `BETTER_AUTH_URL` set to match, since
 * better-auth only trusts ports 3000, 3001 and 3333 (`server/utils/auth.ts`).
 */
export const BASE = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3333}`

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
 * Navigate with automatic retry on ERR_ABORTED.
 * Under load the Nitro server occasionally drops the first connection.
 */
async function gotoWithRetry(page: Page, url: string, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      return
    } catch (err: unknown) {
      if (i === retries - 1) throw err
      // Back off before retrying
      await page.waitForTimeout(500 * (i + 1))
    }
  }
}

/**
 * Budget for the waits in THESE SETUP HELPERS — not for anything under test.
 *
 * Measured 2026-09-01 on an idle server: `/register`'s form mounts in **1.0 s**, and the campaigns
 * page's "New Campaign" button appears **0.6-1.2 s** after a real sign-up (three consecutive
 * sign-ups, session included). So the operations themselves are ~1 s.
 *
 * Under a full 343-test run they blew a 15 s budget **47 times**, all in setup and none in an
 * assertion, with 88 stack frames pointing at the `createCampaign` wait below. Every one passed on
 * retry, so the suite was green and simply paid ~40 minutes of retries.
 *
 * Raising this is NOT "fixing the test to make it pass": the thing being waited for is a
 * precondition, it is measured at ~1 s unloaded, and nothing here asserts behaviour. What the old
 * number did was convert server contention into a spurious retry.
 *
 * If a wait here ever exhausts even THIS budget, that is a real signal — do not raise it again;
 * find out what is taking a minute.
 */
const SETUP_WAIT_MS = 60_000

/**
 * Register a new user and land on the home page (authenticated).
 * Returns the email used.
 */
export async function registerAndLogin(page: Page, name: string = 'E2E User'): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
  await gotoWithRetry(page, `${BASE}/register`)
  await page.waitForSelector('form', { timeout: SETUP_WAIT_MS })
  await page.fill('#name', name)
  await page.fill('#email', email)
  await page.fill('#password', 'testpassword123')
  await page.click('button[type="submit"]')
  // window.location.href = '/' causes full reload — poll instead of strict waitForURL
  await waitForSPANavigation(page, `${BASE}/`, 45000)
  await page.waitForLoadState('networkidle')
  return email
}

/**
 * Make an authenticated API call from within the page context, automatically
 * injecting the CSRF token for mutating methods.
 */
export async function apiFetch(
  page: Page,
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  return page.evaluate(
    async ([p, o]: [string, { method?: string; body?: unknown }]) => {
      const method = (o.method || 'GET').toUpperCase()
      const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      const csrf = mutating ? document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '' : ''
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (csrf) headers['X-CSRF-Token'] = csrf
      const res = await fetch(p, {
        method,
        headers,
        credentials: 'include',
        body: o.body != null ? JSON.stringify(o.body) : undefined,
      })
      if (!res.ok && res.status !== 404) {
        const text = await res.text()
        throw new Error(`apiFetch ${method} ${p} → ${res.status}: ${text.slice(0, 200)}`)
      }
      try {
        return await res.json()
      } catch {
        return null
      }
    },
    [path, opts] as [string, { method?: string; body?: unknown }],
  )
}

/**
 * Create a campaign from the home page. Assumes user is authenticated.
 * Returns the campaign URL path.
 */
export async function createCampaign(page: Page, name: string): Promise<string> {
  await gotoWithRetry(page, `${BASE}/`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('button:has-text("New Campaign")', { timeout: SETUP_WAIT_MS })
  await page.click('button:has-text("New Campaign")')
  await page.waitForSelector('input[placeholder*="Curse"]', { timeout: SETUP_WAIT_MS })
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
