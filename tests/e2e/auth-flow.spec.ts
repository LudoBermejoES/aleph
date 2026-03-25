import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3333'

test.describe('Health & Public Access', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
  })

  test('unauthenticated access redirects to /login', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await page.waitForURL('**/login', { timeout: 15000 })
    expect(page.url()).toContain('/login')
  })
})

test.describe('Registration & Login', () => {
  const password = 'testpassword123'

  test('register new user', async ({ page }) => {
    const email = `e2e-reg-${Date.now()}@example.com`
    await page.goto(`${BASE}/register`)
    await page.waitForSelector('form', { timeout: 15000 })

    await page.fill('#name', 'E2E Test User')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')

    // window.location.href = '/' triggers full reload
    await page.waitForURL(`${BASE}/`, { timeout: 15000 })
  })

  test('login with valid credentials', async ({ page }) => {
    // Register first (fresh browser context)
    const email = `e2e-login-${Date.now()}@example.com`
    await page.goto(`${BASE}/register`)
    await page.waitForSelector('form', { timeout: 15000 })
    await page.fill('#name', 'Login Tester')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/`, { timeout: 15000 })

    // Clear cookies and login
    await page.context().clearCookies()
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form', { timeout: 15000 })
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')

    await page.waitForURL(`${BASE}/`, { timeout: 15000 })
    expect(page.url()).not.toContain('/login')
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form', { timeout: 15000 })

    await page.fill('#email', 'wrong@example.com')
    await page.fill('#password', 'wrongpassword')
    await page.click('button[type="submit"]')

    await page.waitForSelector('.text-destructive', { timeout: 10000 })
    const errorText = await page.textContent('.text-destructive')
    expect(errorText).toBeTruthy()
  })
})

test.describe('Campaign Flow (authenticated)', () => {
  test('create campaign and see dashboard', async ({ page }) => {
    // Register fresh user
    const email = `e2e-camp-${Date.now()}@example.com`
    await page.goto(`${BASE}/register`)
    await page.waitForSelector('form', { timeout: 15000 })
    await page.fill('#name', 'Campaign Tester')
    await page.fill('#email', email)
    await page.fill('#password', 'testpassword123')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/`, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // Click New Campaign
    await page.waitForSelector('button:has-text("New Campaign")', { timeout: 15000 })
    await page.click('button:has-text("New Campaign")')

    // Fill dialog
    await page.waitForSelector('input[placeholder*="Curse"]', { timeout: 5000 })
    await page.fill('input[placeholder*="Curse"]', 'E2E Test Campaign')
    await page.click('[role="dialog"] button:has-text("Create")')

    // Wait for SPA navigation to campaign dashboard
    await page.waitForURL('**/campaigns/**', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('E2E Test Campaign', { timeout: 10000 })
  })
})
