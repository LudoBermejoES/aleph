import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

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

    await apiFetch(page, `/api/campaigns/${campaignId}/sub-campaigns`, {
      method: 'POST',
      body: { name: 'Mortales' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      body: { name: 'Arco general' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      body: { name: 'Arco mortal', subCampaignSlug: 'mortales' },
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

    await apiFetch(page, `/api/campaigns/${campaignId}/sub-campaigns`, {
      method: 'POST',
      body: { name: 'Mortales' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Mision mortal activa', subCampaignSlug: 'mortales', status: 'active' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Mision mortal completada', subCampaignSlug: 'mortales', status: 'completed' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Mision general activa' },
    })

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

  // The only e2e that touched sub-campaigns created them by API and then looked at a tab, so the
  // management page itself — the form, the save, the list — had never been exercised by anything.
  test('a sub-campaign can be created through the UI, not only by API', async ({ page }) => {
    await registerAndLogin(page, 'UI SubCampaign User')
    const campaignId = idOf(await createCampaign(page, `UI subcampañas ${Date.now()}`))

    await page.goto(`/campaigns/${campaignId}/sub-campaigns`)
    const name = `Creada en la UI ${Date.now()}`

    await page
      .getByRole('button', { name: /New|Nueva|Crear|Create/ })
      .first()
      .click()
    await page.locator('input[type="text"]').first().fill(name)
    await page
      .getByRole('button', { name: /Save|Create|Guardar|Crear/ })
      .last()
      .click()

    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 })

    // And it is real, not just painted: the server lists it too.
    const subs = (await apiFetch(page, `/api/campaigns/${campaignId}/sub-campaigns`)) as Array<{
      name: string
    }>
    expect(subs.some((s) => s.name === name)).toBe(true)
  })
})
