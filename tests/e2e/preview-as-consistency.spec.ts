import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('preview_as - arc secret blocks', () => {
  test('switching combobox to player hides arc secret without page reload', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Arc Preview DM')
    await createCampaign(dmPage, `Arc Preview Camp ${uid()}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create arc with a secret block in the description
    await apiFetch(dmPage, `/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      body: {
        name: 'The Secret Arc',
        description: 'Public arc lore.\n\n:::secret{.dm}\nDM-only arc secret.\n:::\n',
        status: 'active',
      },
    })
    const arcs = (await apiFetch(dmPage, `/api/campaigns/${campaignId}/arcs`)) as Array<
      Record<string, unknown>
    >
    const arcSlug =
      (arcs.find((a) => a.name === 'The Secret Arc')?.slug as string) || 'the-secret-arc'

    await dmPage.goto(`${BASE}/campaigns/${campaignId}/arcs/${arcSlug}`)
    await dmPage.waitForLoadState('load')

    // DM sees secret block
    await expect(dmPage.locator('main')).toContainText('Public arc lore', { timeout: 15000 })
    await expect(dmPage.locator('main')).toContainText('DM-only arc secret')

    // Switch preview to player
    await dmPage.locator('[data-testid="preview-role-select"]').selectOption('player')
    await dmPage.waitForURL(/preview_as=player/, { timeout: 5000 })
    await dmPage.waitForLoadState('load')

    // Secret disappears
    await expect(dmPage.locator('main')).toContainText('Public arc lore', { timeout: 15000 })
    await expect(dmPage.locator('main')).not.toContainText('DM-only arc secret')

    await dmContext.close()
  })
})

test.describe('preview_as - quest secret blocks', () => {
  test('switching combobox to player hides quest secret without page reload', async ({
    browser,
  }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Quest Preview DM')
    await createCampaign(dmPage, `Quest Preview Camp ${uid()}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create quest with a secret block
    const questRes = await apiFetch(dmPage, `/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      body: {
        name: 'The Hidden Quest',
        description: 'Public quest info.\n\n:::secret{.dm}\nDM-only quest secret.\n:::\n',
        status: 'active',
      },
    })
    const questSlug = (questRes as Record<string, unknown>).slug as string

    await dmPage.goto(`${BASE}/campaigns/${campaignId}/quests/${questSlug}`)
    await dmPage.waitForLoadState('networkidle')

    // DM sees secret
    await expect(dmPage.locator('main')).toContainText('Public quest info', { timeout: 10000 })
    await expect(dmPage.locator('main')).toContainText('DM-only quest secret')

    // Switch to player view
    await dmPage.locator('[data-testid="preview-role-select"]').selectOption('player')
    await dmPage.waitForURL(/preview_as=player/, { timeout: 5000 })
    await dmPage.waitForLoadState('networkidle')

    // Secret disappears
    await expect(dmPage.locator('main')).toContainText('Public quest info', { timeout: 10000 })
    await expect(dmPage.locator('main')).not.toContainText('DM-only quest secret')

    await dmContext.close()
  })
})

test.describe('preview_as - location secret blocks', () => {
  test('switching combobox to player hides location secret without page reload', async ({
    browser,
  }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Loc Preview DM')
    await createCampaign(dmPage, `Loc Preview Camp ${uid()}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create location via API
    const locRes = await apiFetch(dmPage, `/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      body: {
        name: 'The Secret Dungeon',
        content: 'Public location info.\n\n:::secret{.dm}\nDM-only location secret.\n:::\n',
        subtype: 'dungeon',
      },
    })
    const locSlug = (locRes as Record<string, unknown>).slug as string

    await dmPage.goto(`${BASE}/campaigns/${campaignId}/locations/${locSlug}`)
    await dmPage.waitForLoadState('networkidle')

    // DM sees secret
    await expect(dmPage.locator('main')).toContainText('Public location info', { timeout: 10000 })
    await expect(dmPage.locator('main')).toContainText('DM-only location secret')

    // Switch to player view
    await dmPage.locator('[data-testid="preview-role-select"]').selectOption('player')
    await dmPage.waitForURL(/preview_as=player/, { timeout: 5000 })
    await dmPage.waitForLoadState('networkidle')

    // Secret disappears
    await expect(dmPage.locator('main')).toContainText('Public location info', { timeout: 10000 })
    await expect(dmPage.locator('main')).not.toContainText('DM-only location secret')

    await dmContext.close()
  })
})

test.describe('preview_as - session secret blocks', () => {
  test('render endpoint returns stripped content for player preview', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Session Preview DM')
    await createCampaign(dmPage, `Session Preview Camp ${uid()}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create session with a secret block in content
    const sessionRes = await apiFetch(dmPage, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: {
        title: 'The Mysterious Session',
        content:
          '# The Mysterious Session\n\nPublic session recap.\n\n:::secret{.dm}\nDM-only session secret.\n:::\n',
        status: 'completed',
      },
    })
    const sessionSlug = (sessionRes as Record<string, unknown>).slug as string

    // DM calls render endpoint directly — should include secret
    const dmRender = await apiFetch(
      dmPage,
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/render`,
    )
    expect((dmRender as Record<string, unknown>).content as string).toContain(
      'DM-only session secret',
    )

    // DM calls render with preview_as=player — secret should be stripped
    const playerRender = await apiFetch(
      dmPage,
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/render?preview_as=player`,
    )
    expect((playerRender as Record<string, unknown>).content as string).not.toContain(
      'DM-only session secret',
    )
    expect((playerRender as Record<string, unknown>).content as string).toContain(
      'Public session recap',
    )
    expect((playerRender as Record<string, unknown>).previewMode as boolean).toBe(true)

    await dmContext.close()
  })
})
