import { test, expect } from '@playwright/test'
import Database from 'better-sqlite3'
import { join } from 'path'
import { BASE } from './helpers'

const API = `${BASE}/api`

function promoteToAdmin(email: string) {
  const db = new Database(join(process.cwd(), 'data', 'aleph.db'))
  db.prepare('UPDATE user SET role = ? WHERE email = ?').run('admin', email)
  db.close()
}

async function createUserViaApi(name: string, email: string, password = 'password123') {
  await fetch(`${API}/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ name, email, password }),
  })
}

async function registerPromoteAndLogin(
  page: import('@playwright/test').Page,
  name: string,
): Promise<string> {
  const email = `e2e-admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`

  // Register via server-side Node fetch (does NOT touch browser session)
  await createUserViaApi(name, email)

  // Promote to admin before logging in so the session picks up the role
  promoteToAdmin(email)

  // Log in via the browser so the session reads role=admin from DB
  await page.goto(`${BASE}/login`)
  await page.waitForSelector('form', { timeout: 15000 })
  await page.fill('#email', email)
  await page.fill('#password', 'password123')
  await page.click('button[type="submit"]')
  await expect(async () => {
    expect(page.url()).not.toContain('/login')
  }).toPass({ timeout: 20000 })
  await page.waitForLoadState('networkidle')

  return email
}

test.describe('Admin user management', () => {
  test('admin sees manage users link and can open user list', async ({ page }) => {
    await registerPromoteAndLogin(page, 'E2E Admin')

    await page.goto(`${BASE}/settings`)
    await page.waitForLoadState('networkidle')

    const manageLink = page.getByRole('link', { name: /manage users/i })
    await expect(manageLink).toBeVisible({ timeout: 10000 })
    await manageLink.click()

    await expect(page).toHaveURL(/\/settings\/users/, { timeout: 10000 })
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('tbody tr').first()).toBeVisible()
  })

  test('admin can edit a user name', async ({ page }) => {
    await registerPromoteAndLogin(page, 'E2E Admin Edit')

    // Create a target user via Node.js fetch (does NOT affect browser session)
    const targetEmail = `e2e-target-${Date.now()}@example.com`
    await createUserViaApi('Target User', targetEmail)

    await page.goto(`${BASE}/settings/users`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

    const targetRow = page.locator('tbody tr').filter({ hasText: targetEmail })
    await targetRow.getByRole('button', { name: /edit/i }).click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    const nameInput = dialog.locator('input').first()
    await nameInput.fill('Updated E2E Name')
    await dialog.getByRole('button', { name: /save/i }).click()

    // The target row (identified by email) should now show the new name
    const updatedRow = page.locator('tbody tr').filter({ hasText: targetEmail })
    await expect(updatedRow.filter({ hasText: 'Updated E2E Name' })).toBeVisible({
      timeout: 10000,
    })
  })

  test('admin can delete a user', async ({ page }) => {
    await registerPromoteAndLogin(page, 'E2E Admin Delete')

    const deleteEmail = `e2e-delete-${Date.now()}@example.com`
    await createUserViaApi('Delete Target', deleteEmail)

    await page.goto(`${BASE}/settings/users`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

    const targetRow = page.locator('tbody tr').filter({ hasText: deleteEmail })

    const [, deleteResponse] = await Promise.all([
      page.waitForEvent('dialog').then((d) => d.accept()),
      page.waitForResponse(
        (r) => r.url().includes('/api/admin/users/') && r.request().method() === 'DELETE',
        { timeout: 15000 },
      ),
      targetRow.getByRole('button', { name: /delete/i }).click(),
    ])

    const deleteStatus = deleteResponse.status()
    expect(deleteStatus, `DELETE returned unexpected status ${deleteStatus}`).toBe(204)

    await expect(page.locator('tbody tr').filter({ hasText: deleteEmail })).toHaveCount(0, {
      timeout: 10000,
    })
  })

  test('non-admin is redirected away from /settings/users', async ({ page }) => {
    const email = `e2e-nonadmin-${Date.now()}@example.com`
    await page.goto(`${BASE}/register`)
    await page.waitForSelector('form', { timeout: 15000 })
    await page.fill('#name', 'NonAdmin User')
    await page.fill('#email', email)
    await page.fill('#password', 'testpassword123')
    await page.click('button[type="submit"]')
    await expect(async () => {
      expect(page.url()).not.toContain('/register')
    }).toPass({ timeout: 20000 })

    try {
      await page.goto(`${BASE}/settings/users`, { waitUntil: 'commit' })
    } catch {
      // SPA middleware redirect interrupts navigation — expected
    }

    await expect(async () => {
      expect(page.url()).toMatch(/\/settings($|\?|\/(?!users))/)
    }).toPass({ timeout: 10000 })
  })
})
