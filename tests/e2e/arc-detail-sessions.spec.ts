import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

/**
 * The arc detail page must list the sessions filed under that arc.
 *
 * Regression: the page fetched a default page of every session in the campaign and
 * filtered it client-side. The paginated endpoint answers with a `{ data, meta }`
 * envelope, so `.filter` threw, load() aborted, and the "Linked Sessions" section never
 * rendered — for every arc, whatever its size.
 */
test.describe('Arc detail — linked sessions', () => {
  test('lists the arc’s sessions and only those', async ({ page }) => {
    await registerAndLogin(page, 'Arc Sessions DM')
    await createCampaign(page, `Arc Sessions ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    await apiFetch(page, `/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      body: { name: 'Opening Arc', status: 'active' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      body: { name: 'Closing Arc', status: 'planned' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      body: { name: 'Quiet Arc', status: 'planned' },
    })

    for (const title of ['Ashes on the Rails', 'The Dome Above']) {
      await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
        method: 'POST',
        body: { title, arcSlug: 'opening-arc' },
      })
    }
    await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: 'Somewhere Else Entirely', arcSlug: 'closing-arc' },
    })

    await page.goto(`/campaigns/${campaignId}/arcs/opening-arc`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('main h1')).toContainText('Opening Arc', { timeout: 15000 })

    // The section is only rendered when sessions were actually loaded.
    const section = page.locator('main section', {
      has: page.locator('h2:text-is("Linked Sessions")'),
    })
    await expect(section).toBeVisible({ timeout: 15000 })
    await expect(section.locator('a')).toHaveCount(2)
    await expect(section).toContainText('Ashes on the Rails')
    await expect(section).toContainText('The Dome Above')
    await expect(section).not.toContainText('Somewhere Else Entirely')

    // load() must have completed — no error toast from a blown-up response shape.
    await expect(page.locator('body')).not.toContainText('is not a function')

    // An arc with no sessions at all: no section, and chapters keep their own empty state.
    await page.goto(`/campaigns/${campaignId}/arcs/quiet-arc`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main h1')).toContainText('Quiet Arc', { timeout: 15000 })

    await expect(page.locator('h2:text-is("Linked Sessions")')).toHaveCount(0)
    // Chapters still render their own empty state rather than looking broken.
    await expect(page.locator('main')).toContainText('No chapters yet')
    await expect(page.locator('body')).not.toContainText('is not a function')
  })
})
