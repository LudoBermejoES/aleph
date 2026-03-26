import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin } from './helpers'

test.describe('Health & Public Access', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.version).toBeDefined()
  })

  test('unauthenticated access redirects to /login', async ({ page }) => {
    await page.goto(`${BASE}/`)
    // SPA auth middleware redirects client-side — poll for URL change
    await expect(async () => {
      expect(page.url()).toContain('/login')
    }).toPass({ timeout: 15000 })
  })

  test('login page renders form', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form', { timeout: 15000 })
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('register page renders form', async ({ page }) => {
    await page.goto(`${BASE}/register`)
    await page.waitForSelector('form', { timeout: 15000 })
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })
})

test.describe('Registration', () => {
  test('register new user redirects to home', async ({ page }) => {
    await registerAndLogin(page, 'Register Test')
    expect(page.url()).toBe(`${BASE}/`)
  })

  test('register page links to login', async ({ page }) => {
    await page.goto(`${BASE}/register`)
    await page.waitForSelector('form', { timeout: 15000 })
    const link = page.locator('a[href="/login"]')
    await expect(link).toBeVisible()
  })
})

test.describe('Login', () => {
  test('login with valid credentials redirects to home', async ({ page }) => {
    const email = await registerAndLogin(page, 'Login Test')

    // Logout and login again
    await page.context().clearCookies()
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form', { timeout: 15000 })
    await page.fill('#email', email)
    await page.fill('#password', 'testpassword123')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/`, { timeout: 15000 })
    expect(page.url()).not.toContain('/login')
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form', { timeout: 15000 })
    await page.fill('#email', 'nonexistent@example.com')
    await page.fill('#password', 'wrongpassword')
    await page.click('button[type="submit"]')

    await page.waitForSelector('.text-destructive', { timeout: 10000 })
    const errorText = await page.textContent('.text-destructive')
    expect(errorText).toBeTruthy()
  })

  test('login page links to register', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form', { timeout: 15000 })
    await expect(page.locator('a[href="/register"]')).toBeVisible()
  })
})

test.describe('Logout', () => {
  test('sign out redirects to login', async ({ page }) => {
    await registerAndLogin(page, 'Logout Test')
    await page.click('button:has-text("Sign Out")')
    await page.waitForURL('**/login', { timeout: 15000 })
    expect(page.url()).toContain('/login')
  })
})
