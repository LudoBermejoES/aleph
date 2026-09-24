import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Quests', () => {
  test('create quest and see in list', async ({ page }) => {
    await registerAndLogin(page, 'Quest Creator')
    await createCampaign(page, `Quest Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Find the Lost Sword', description: 'A legendary weapon lies hidden' },
    })

    await page.click('aside >> text=Quests')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main >> text=Find the Lost Sword')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=active').first()).toBeVisible()
  })

  test('quest with sub-quest shows nesting', async ({ page }) => {
    await registerAndLogin(page, 'Sub Quest')
    await createCampaign(page, `Sub Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    const parent = await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Main Quest' },
    })
    await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Sub Quest Step', parentQuestId: (parent as Record<string, unknown>).id },
    })

    await page.click('aside >> text=Quests')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main >> text=Main Quest')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main >> text=Sub Quest Step')).toBeVisible()
  })

  test('quest status filter', async ({ page }) => {
    await registerAndLogin(page, 'Status Filter')
    await createCampaign(page, `Status Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
    await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Active Quest', status: 'active' },
    })
    const doneQuest = await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: { name: 'Done Quest' },
    })
    await apiFetch(
      page,
      `/api/campaigns/${campaignId}/quests/${(doneQuest as Record<string, unknown>).slug}`,
      {
        method: 'PUT',
        body: { status: 'completed' },
      },
    )

    await page.click('aside >> text=Quests')
    await page.waitForLoadState('networkidle')

    // Filter to completed
    await page.click('main >> button:has-text("Completed")')
    await page.waitForTimeout(1000)
    await expect(page.locator('main >> text=Done Quest')).toBeVisible({ timeout: 5000 })
  })
})

/**
 * A quest description is full markdown, and the list card used to print it raw inside a <p>:
 * the asterisks showed literally, HTML collapsed every newline, and a long description filled
 * the card with an unreadable wall of text. The detail page was always fine (it renders through
 * <MDC>), which is why this only ever broke on the list.
 *
 * Asserted here rather than in a unit test because the defect was the PAGE choosing raw
 * interpolation over the excerpt helper -- `buildExcerpt` itself was correct and tested the
 * whole time.
 */
test('the quests list shows an excerpt, not raw markdown', async ({ page }) => {
  await registerAndLogin(page, 'Markdown Quest')
  await createCampaign(page, `Markdown Camp ${uid()}`)

  const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
  await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
    method: 'POST',
    body: {
      name: 'Las guardas de la capilla',
      description: [
        'El 20 de agosto cayó del cielo un periódico enrollado.',
        '',
        'Lo importante fue que **un objeto atravesó las protecciones**.',
        '',
        'La lista de lo que no habían pensado:',
        '- **Timon Sauerbeck sabe su dirección.**',
        '- El portal sigue sin sellar.',
      ].join('\n'),
    },
  })

  await page.click('aside >> text=Quests')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main >> text=Las guardas de la capilla')).toBeVisible({
    timeout: 10000,
  })

  const card = page.locator('main').getByText('El 20 de agosto cayó del cielo')
  await expect(card).toBeVisible()

  // The whole point: no markdown syntax survives into what the reader sees.
  const shown = (await card.innerText()).trim()
  expect(shown).not.toContain('**')
  expect(shown).not.toMatch(/^\s*-\s/m)

  // And the card is an excerpt, not the whole field -- the last bullet must not be in it.
  expect(shown).not.toContain('El portal sigue sin sellar')

  // Control: the detail page DOES show the full text, with the bold rendered as an element
  // rather than as asterisks. Without this, hiding the description entirely would pass above.
  await page.click('main >> text=Las guardas de la capilla')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main >> text=El portal sigue sin sellar')).toBeVisible({
    timeout: 10000,
  })
  await expect(
    page.locator('main strong', { hasText: 'un objeto atravesó las protecciones' }),
  ).toBeVisible()
})

/**
 * add-quest-short-description §8.1.
 *
 * NOTE: `tests/e2e/` DOES NOT RUN IN CI. `.github/workflows` runs format, eslint,
 * `vitest run tests/unit/`, the integration suite and the build — no Playwright. What actually
 * enforces this behaviour is `tests/unit/components/quest-list.test.ts` (the branch classes) plus
 * the integration suite (persistence). This spec is a local tool, not a gate; treating it as one
 * is how this project has been fooled before.
 */
test('the quests list shows the short description whole, and falls back when absent', async ({
  page,
}) => {
  await registerAndLogin(page, 'Short Desc User')
  await createCampaign(page, `Short Desc Camp ${uid()}`)

  const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

  // 200 characters exactly: the cap, so it must survive whole with no ellipsis.
  const shortText = `Symcha Landau ha llegado a Berlín para juzgar el Avatar de Otto y ${'x'.repeat(
    200 - 66,
  )}`
  await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
    method: 'POST',
    body: {
      name: 'Con descripción corta',
      shortDescription: shortText,
      description: 'Una descripción larga con **markdown** que NO debe verse en el listado.',
    },
  })
  await apiFetch(page, `/api/campaigns/${campaignId}/quests`, {
    method: 'POST',
    body: {
      name: 'Sin descripción corta',
      description: 'Solo la larga, con **markdown** y\n\nvarios párrafos que deben resumirse.',
    },
  })

  await page.click('aside >> text=Quests')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main >> text=Con descripción corta')).toBeVisible({ timeout: 10000 })

  // 1. The short description is shown IN FULL, with nothing trimmed.
  const withShort = page.locator('main p', { hasText: 'Symcha Landau ha llegado a Berlín' })
  const shownShort = (await withShort.innerText()).trim()
  expect(shownShort).toBe(shortText)
  expect(shownShort).not.toContain('…')

  // And the long description is NOT what the card shows.
  expect(shownShort).not.toContain('NO debe verse')

  // 2. The control: a quest without one still shows the excerpt, flattened and clamped. Without
  // this, a list that simply hid every description would pass the assertions above.
  const withoutShort = page.locator('main p', { hasText: 'Solo la larga' })
  const shownExcerpt = (await withoutShort.innerText()).trim()
  expect(shownExcerpt).not.toContain('**')
  expect(shownExcerpt).toContain('varios párrafos')
})
