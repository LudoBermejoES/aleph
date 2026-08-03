import { test, expect, type Page } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch, BASE } from './helpers'

const uid = () => `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`

const PNG_1PX_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function waitForSession(page: Page) {
  await expect(async () => {
    const status = await page
      .evaluate(async () => (await fetch('/api/me', { credentials: 'include' })).status)
      .catch(() => 0)
    expect(status).toBe(200)
  }).toPass({ timeout: 30000 })
}

async function setup(page: Page) {
  await registerAndLogin(page, `Char Gallery DM ${uid()}`)
  await waitForSession(page)
  await createCampaign(page, `Char Gallery Camp ${uid()}`)
  const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0] as string

  const char = (await apiFetch(page, `/api/campaigns/${campaignId}/characters`, {
    method: 'POST',
    body: { name: `Aragorn ${uid()}`, characterType: 'pc' },
  })) as { slug: string; name: string }

  return { campaignId, slug: char.slug, name: char.name }
}

async function uploadViaUi(page: Page, filename = 'portrait.png') {
  await page.setInputFiles('[data-testid="gallery-file-input"]', {
    name: filename,
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_1PX_BASE64, 'base64'),
  })
}

test.describe('Character image gallery', () => {
  test('editor uploads two portraits, sets the second as primary, header portrait updates', async ({
    page,
  }) => {
    const { campaignId, slug } = await setup(page)

    await page.goto(`${BASE}/campaigns/${campaignId}/characters/${slug}`)
    await page.waitForLoadState('networkidle')

    // Gallery panel is visible (editor can edit)
    await expect(page.getByTestId('gallery-upload')).toBeVisible()
    await expect(page.getByTestId('gallery-item')).toHaveCount(0)

    // Upload first portrait
    await uploadViaUi(page, 'first.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    await expect(page.getByTestId('gallery-primary-badge')).toHaveCount(1)

    // Upload second portrait
    await uploadViaUi(page, 'second.png')
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)
    await expect(page.getByTestId('gallery-primary-badge')).toHaveCount(1)

    // First is still primary
    await expect(
      page.getByTestId('gallery-item').first().getByTestId('gallery-primary-badge'),
    ).toBeVisible()

    // Promote the second
    await page.getByTestId('gallery-set-main').first().click()
    await expect(
      page.getByTestId('gallery-item').nth(1).getByTestId('gallery-primary-badge'),
    ).toBeVisible()
    await expect(page.getByTestId('gallery-primary-badge')).toHaveCount(1)

    // Header portrait should now reflect the new primary's URL
    const newPrimaryUrl = await page
      .getByTestId('gallery-item')
      .nth(1)
      .locator('img')
      .getAttribute('src')
    await expect(page.locator(`img[src="${newPrimaryUrl}"]`).first()).toBeVisible()
  })

  test('editor deletes a portrait and the gallery updates', async ({ page }) => {
    const { campaignId, slug } = await setup(page)
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto(`${BASE}/campaigns/${campaignId}/characters/${slug}`)
    await page.waitForLoadState('networkidle')

    await uploadViaUi(page)
    await uploadViaUi(page)
    await expect(page.getByTestId('gallery-item')).toHaveCount(2)

    await page.getByTestId('gallery-delete').first().click()
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
    await expect(page.getByTestId('gallery-primary-badge')).toHaveCount(1)
  })

  test('gallery is visible on the character edit page', async ({ page }) => {
    const { campaignId, slug } = await setup(page)

    await page.goto(`${BASE}/campaigns/${campaignId}/characters/${slug}/edit`)
    await page.waitForLoadState('networkidle')

    // Gallery upload button is present (edit page, editable = true)
    await expect(page.getByTestId('gallery-upload')).toBeVisible()

    await uploadViaUi(page)
    await expect(page.getByTestId('gallery-item')).toHaveCount(1)
  })
})
