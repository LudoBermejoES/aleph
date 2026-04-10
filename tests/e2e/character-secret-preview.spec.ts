import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Character secret blocks - page rendering', () => {
  test('switching preview combobox to player hides secret block without page reload', async ({
    browser,
  }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Secret DM')
    await createCampaign(dmPage, `Secret Char Camp ${uid()}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a character with a secret block
    const charRes = await apiFetch(dmPage, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: {
        name: 'Secretive Hero',
        content: 'Public backstory.\n\n:::secret{.dm}\nThis is DM-only information.\n:::\n',
        visibility: 'members',
      },
    })
    const charSlug = (charRes as Record<string, unknown>).slug as string

    // DM views the page — secret IS visible
    await dmPage.goto(`${BASE}/campaigns/${campaignId}/characters/${charSlug}`)
    await dmPage.waitForLoadState('networkidle')
    await expect(dmPage.locator('main')).toContainText('DM-only information', { timeout: 10000 })
    await expect(dmPage.locator('main')).toContainText('Public backstory')

    // DM switches the preview combobox to "Player" — no page reload
    // Use the select inside main (not the language switcher in the sidebar)
    await dmPage.locator('main select').selectOption('player')
    // Wait for URL to update and content to reload
    await dmPage.waitForURL(/preview_as=player/, { timeout: 5000 })
    await dmPage.waitForLoadState('networkidle')

    // Secret block must disappear from the page without a reload
    await expect(dmPage.locator('main')).toContainText('Public backstory', { timeout: 10000 })
    await expect(dmPage.locator('main')).not.toContainText('DM-only information')

    // Switching back to DM shows the secret again
    await dmPage.locator('main select').selectOption('')
    await dmPage.waitForFunction(() => !window.location.search.includes('preview_as'), {
      timeout: 5000,
    })
    await dmPage.waitForLoadState('networkidle')
    await expect(dmPage.locator('main')).toContainText('DM-only information', { timeout: 10000 })

    await dmContext.close()
  })

  test('player cannot see secret block content on the character page', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Secret DM2')
    await createCampaign(dmPage, `Secret Char Camp2 ${uid()}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    const charRes = await apiFetch(dmPage, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: {
        name: 'Hidden Hero',
        content: 'Public text.\n\n:::secret{.dm}\nPlayer must not see this.\n:::\n',
        visibility: 'members',
      },
    })
    const charSlug = (charRes as Record<string, unknown>).slug as string

    const inviteRes = await apiFetch(dmPage, `/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      body: { role: 'player' },
    })

    const playerContext = await browser.newContext()
    const playerPage = await playerContext.newPage()
    await registerAndLogin(playerPage, 'Curious Player')
    await playerPage.waitForTimeout(500)
    await apiFetch(playerPage, `/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: { token: (inviteRes as Record<string, unknown>).token },
    })

    // Player navigates to the character page — secret must NOT appear
    await playerPage.goto(`${BASE}/campaigns/${campaignId}/characters/${charSlug}`)
    await playerPage.waitForLoadState('networkidle')
    await expect(playerPage.locator('main')).toContainText('Public text', { timeout: 10000 })
    await expect(playerPage.locator('main')).not.toContainText('Player must not see this')

    // Player cannot abuse preview_as=dm in the URL to escalate
    await playerPage.goto(`${BASE}/campaigns/${campaignId}/characters/${charSlug}?preview_as=dm`)
    await playerPage.waitForLoadState('networkidle')
    await expect(playerPage.locator('main')).not.toContainText('Player must not see this')

    await dmContext.close()
    await playerContext.close()
  })
})
