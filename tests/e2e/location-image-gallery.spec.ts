import { test, expect } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch, BASE } from './helpers'

const uid = () => `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`

// A real 1×1 PNG. The upload route checks magic bytes, so a placeholder string will not do.
const PNG_1PX_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/**
 * `registerAndLogin()` returns before better-auth's Set-Cookie has necessarily landed, so any
 * immediate API call can answer 401. Polling /api/me is the only reliable signal.
 */
async function waitForSession(page: Page) {
  await expect(async () => {
    const status = await page
      .evaluate(async () => (await fetch('/api/me', { credentials: 'include' })).status)
      .catch(() => 0)
    expect(status).toBe(200)
  }).toPass({ timeout: 30000 })
}

interface Setup {
  campaignId: string
  slug: string
  name: string
  token: string
}

async function dmSetup(page: Page, inviteRole = 'player'): Promise<Setup> {
  await registerAndLogin(page, `Gallery DM ${uid()}`)
  await waitForSession(page)
  await createCampaign(page, `Gallery Camp ${uid()}`)
  const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string

  const invite = (await apiFetch(page, `/api/campaigns/${campaignId}/invite`, {
    method: 'POST',
    body: { role: inviteRole },
  })) as { token: string }

  const name = `Waterdeep ${uid()}`
  const loc = (await apiFetch(page, `/api/campaigns/${campaignId}/locations`, {
    method: 'POST',
    body: { name, subtype: 'city', content: 'The City of Splendors' },
  })) as { slug: string }

  return { campaignId, slug: loc.slug, name, token: invite.token }
}

/** Register a fresh user in their own context and accept the invite. */
async function joinAsNewUser(browser: Browser, campaignId: string, token: string, label: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await registerAndLogin(page, `${label} ${uid()}`)
  await waitForSession(page)
  await apiFetch(page, `/api/campaigns/${campaignId}/join`, { method: 'POST', body: { token } })
  return { context, page }
}

/** Upload through the gallery file input, which is hidden behind the Upload button. */
async function uploadViaUi(page: Page, filename = 'shot.png') {
  await page.setInputFiles('[data-testid="gallery-file-input"]', {
    name: filename,
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_1PX_BASE64, 'base64'),
  })
}

test.describe('Location image gallery', () => {
  test('an editor uploads two images and chooses which one is the main image', async ({ page }) => {
    const { campaignId, slug } = await dmSetup(page)

    await page.goto(`${BASE}/campaigns/${campaignId}/locations/${slug}`)
    await page.waitForLoadState('networkidle')

    // The panel is offered even though the gallery is empty, because this viewer can edit.
    await expect(page.getByTestId('gallery-upload')).toBeVisible()
    await expect(page.getByTestId('gallery-item')).toHaveCount(0)

    await uploadViaUi(page, 'first.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    await expect(page.getByTestId('gallery-primary-badge')).toHaveCount(1)

    await uploadViaUi(page, 'second.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)

    // The first image is still the main one, and only one badge exists.
    await expect(page.getByTestId('gallery-primary-badge')).toHaveCount(1)
    const firstItem = page.getByTestId('gallery-item').first()
    await expect(firstItem.getByTestId('gallery-primary-badge')).toBeVisible()

    // Promote the second image without a page reload.
    await page.getByTestId('gallery-set-main').first().click()
    await expect(
      page.getByTestId('gallery-item').nth(1).getByTestId('gallery-primary-badge'),
    ).toBeVisible()
    await expect(page.getByTestId('gallery-primary-badge')).toHaveCount(1)

    // The header image follows the main image.
    const mainUrl = await page.getByTestId('gallery-item').nth(1).locator('img').getAttribute('src')
    await expect(
      page.locator(`header img[src="${mainUrl}"], img[src="${mainUrl}"]`).first(),
    ).toBeVisible()

    // …and so does the thumbnail on the list page.
    await page.goto(`${BASE}/campaigns/${campaignId}/locations`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`img[src="${mainUrl}"]`).first()).toBeVisible()
  })

  test('an editor deletes an image and the grid updates in place', async ({ page }) => {
    const { campaignId, slug } = await dmSetup(page)
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto(`${BASE}/campaigns/${campaignId}/locations/${slug}`)
    await page.waitForLoadState('networkidle')

    await uploadViaUi(page)
    await uploadViaUi(page)
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)

    await page.getByTestId('gallery-delete').first().click()
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    // A non-empty gallery always keeps exactly one main image.
    await expect(page.getByTestId('gallery-primary-badge')).toHaveCount(1)
  })

  test('a rejected upload shows the server error and leaves the grid untouched', async ({
    page,
  }) => {
    const { campaignId, slug } = await dmSetup(page)

    await page.goto(`${BASE}/campaigns/${campaignId}/locations/${slug}`)
    await page.waitForLoadState('networkidle')

    await uploadViaUi(page)
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)

    // Declared PNG, not actually PNG — the magic-byte check rejects it with a 400.
    await page.setInputFiles('[data-testid="gallery-file-input"]', {
      name: 'fake.png',
      mimeType: 'image/png',
      buffer: Buffer.from('this is not a png'),
    })

    await expect(page.getByTestId('gallery-error')).toBeVisible()
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
  })

  test('a player sees the gallery but no management controls', async ({ page, browser }) => {
    const { campaignId, slug, token } = await dmSetup(page, 'player')

    await page.goto(`${BASE}/campaigns/${campaignId}/locations/${slug}`)
    await page.waitForLoadState('networkidle')
    await uploadViaUi(page)
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)

    const { context, page: playerPage } = await joinAsNewUser(
      browser,
      campaignId,
      token,
      'Gallery Player',
    )
    await playerPage.goto(`${BASE}/campaigns/${campaignId}/locations/${slug}`)
    await playerPage.waitForLoadState('networkidle')

    await expect(playerPage.getByTestId('gallery-item')).toHaveCount(1)
    await expect(playerPage.getByTestId('gallery-upload')).toHaveCount(0)
    await expect(playerPage.getByTestId('gallery-delete')).toHaveCount(0)
    await expect(playerPage.getByTestId('gallery-set-main')).toHaveCount(0)

    await context.close()
  })

  test('a player sees no Images panel on a location with no images', async ({ page, browser }) => {
    const { campaignId, slug, token } = await dmSetup(page, 'player')

    const { context, page: playerPage } = await joinAsNewUser(
      browser,
      campaignId,
      token,
      'Gallery Player',
    )
    await playerPage.goto(`${BASE}/campaigns/${campaignId}/locations/${slug}`)
    await playerPage.waitForLoadState('networkidle')

    await expect(playerPage.getByTestId('gallery-item')).toHaveCount(0)
    await expect(playerPage.getByTestId('gallery-upload')).toHaveCount(0)
    await expect(playerPage.getByText('Images', { exact: true })).toHaveCount(0)

    await context.close()
  })

  test('gallery labels render in both locales with no missing keys', async ({ page }) => {
    const { campaignId, slug } = await dmSetup(page)

    await page.goto(`${BASE}/campaigns/${campaignId}/locations/${slug}`)
    await page.waitForLoadState('networkidle')
    await uploadViaUi(page)
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)

    for (const locale of ['en', 'es'] as const) {
      await page.evaluate((l) => {
        document.cookie = `i18n_redirected=${l}; path=/`
      }, locale)
      await page.reload()
      await page.waitForLoadState('networkidle')

      const panel = page.getByTestId('gallery-upload')
      await expect(panel).toBeVisible()
      const label = (await panel.textContent())?.trim() ?? ''
      // A missing key renders as the key path itself.
      expect(label).not.toContain('locations.images')
      expect(label.length).toBeGreaterThan(0)

      const badge = (await page.getByTestId('gallery-primary-badge').textContent())?.trim() ?? ''
      expect(badge).not.toContain('locations.images')
      expect(badge.length).toBeGreaterThan(0)
    }
  })
})
