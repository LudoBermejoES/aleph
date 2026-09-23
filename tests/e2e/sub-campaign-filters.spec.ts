import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

/**
 * The sub-campaign filter on the arcs and quests lists.
 *
 * These exist because the filter is the one part of this feature that cannot be proved by an API
 * test: the endpoints have accepted `subCampaignSlug` since August and the pages simply never sent
 * it. What is asserted is therefore the behaviour a Narrator sees — click a chip, the list narrows
 * — plus the control that matters: clicking the OTHER chip shows the complement, so a filter that
 * returned a constant, or one that hid everything, would fail.
 */
// `createCampaign` returns the PATH it navigated to (`/campaigns/<uuid>`), not a bare id, and
// interpolating it straight into an API URL builds `/api/campaigns//campaigns/<uuid>/...` — a 404
// that surfaces as an empty list several assertions later.
const idOf = (pathOrId: string) => pathOrId.split('/').filter(Boolean).pop() as string

test.describe('sub-campaign filters', () => {
  test('the arcs list filters by sub-campaign and shows each row badge', async ({ page }) => {
    await registerAndLogin(page, 'Filter User')
    const campaignId = idOf(await createCampaign(page, `Filtros ${Date.now()}`))
    await page.goto(`/campaigns/${campaignId}`)

    // Fixture through the API: this test is about the list page, not about creation forms.
    // Writes need the CSRF token the app itself sends; without the header the POST is rejected
    // and the fixture silently never exists, which surfaces as "the list is empty" three
    // assertions later rather than as a failed setup.
    const mk = async (path: string, body: Record<string, unknown>) =>
      await page.evaluate(
        async ([p, b]) => {
          const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] ?? ''
          const res = await fetch(p as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body: JSON.stringify(b),
          })
          if (!res.ok) throw new Error(`fixture POST ${p} -> ${res.status} ${await res.text()}`)
          return await res.json()
        },
        [path, body] as const,
      )

    await mk(`/api/campaigns/${campaignId}/sub-campaigns`, { name: 'Mortales' })
    await mk(`/api/campaigns/${campaignId}/arcs`, { name: 'Arco general' })
    await mk(`/api/campaigns/${campaignId}/arcs`, {
      name: 'Arco mortal',
      subCampaignSlug: 'mortales',
    })

    await page.goto(`/campaigns/${campaignId}/arcs`)
    await expect(page.getByText('Arco general')).toBeVisible()
    await expect(page.getByText('Arco mortal')).toBeVisible()

    await page.getByRole('button', { name: 'Mortales', exact: false }).first().click()
    await expect(page.getByText('Arco mortal')).toBeVisible()
    await expect(page.getByText('Arco general')).toHaveCount(0)

    // The complement: without this, a filter that simply hid everything would pass above.
    await page
      .getByRole('button', { name: /General|Todas|All/ })
      .first()
      .click()
    await expect(page.getByText('Arco general')).toBeVisible()
  })

  test('the quests filter composes with the status filter', async ({ page }) => {
    await registerAndLogin(page, 'Quest Filter User')
    const campaignId = idOf(await createCampaign(page, `Misiones ${Date.now()}`))
    await page.goto(`/campaigns/${campaignId}`)

    // Writes need the CSRF token the app itself sends; without the header the POST is rejected
    // and the fixture silently never exists, which surfaces as "the list is empty" three
    // assertions later rather than as a failed setup.
    const mk = async (path: string, body: Record<string, unknown>) =>
      await page.evaluate(
        async ([p, b]) => {
          const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] ?? ''
          const res = await fetch(p as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body: JSON.stringify(b),
          })
          if (!res.ok) throw new Error(`fixture POST ${p} -> ${res.status} ${await res.text()}`)
          return await res.json()
        },
        [path, body] as const,
      )

    await mk(`/api/campaigns/${campaignId}/sub-campaigns`, { name: 'Mortales' })
    await mk(`/api/campaigns/${campaignId}/quests`, {
      name: 'Mision mortal activa',
      subCampaignSlug: 'mortales',
      status: 'active',
    })
    await mk(`/api/campaigns/${campaignId}/quests`, {
      name: 'Mision mortal completada',
      subCampaignSlug: 'mortales',
      status: 'completed',
    })
    await mk(`/api/campaigns/${campaignId}/quests`, { name: 'Mision general activa' })

    await page.goto(`/campaigns/${campaignId}/quests`)
    await expect(page.getByText('Mision general activa')).toBeVisible()

    await page.getByRole('button', { name: 'Mortales', exact: false }).first().click()
    await expect(page.getByText('Mision general activa')).toHaveCount(0)
    await expect(page.getByText('Mision mortal activa')).toBeVisible()

    // The point of the test: picking a status must NOT clear the sub-campaign chip.
    await page
      .getByRole('button', { name: /Completad|Completed/ })
      .first()
      .click()
    await expect(page.getByText('Mision mortal completada')).toBeVisible()
    await expect(page.getByText('Mision mortal activa')).toHaveCount(0)
    await expect(page.getByText('Mision general activa')).toHaveCount(0)
  })
})
