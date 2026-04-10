import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Character secret blocks - page rendering', () => {
  test('DM preview_as=player hides secret block on the character page', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Secret DM')
    await createCampaign(dmPage, `Secret Char Camp ${uid()}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a character with a secret block in its content
    const charRes = await apiFetch(dmPage, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: {
        name: 'Secretive Hero',
        content: 'Public backstory.\n\n:::secret{.dm}\nThis is DM-only information.\n:::\n',
        visibility: 'members',
      },
    })
    const charSlug = (charRes as Record<string, unknown>).slug as string

    // DM views the page normally — secret block IS visible
    await dmPage.goto(`${BASE}/campaigns/${campaignId}/characters/${charSlug}`)
    await dmPage.waitForLoadState('networkidle')
    await expect(dmPage.locator('main')).toContainText('DM-only information', { timeout: 10000 })
    await expect(dmPage.locator('main')).toContainText('Public backstory')

    // DM views with preview_as=player — secret block is NOT visible in the page
    await dmPage.goto(`${BASE}/campaigns/${campaignId}/characters/${charSlug}?preview_as=player`)
    await dmPage.waitForLoadState('networkidle')
    await expect(dmPage.locator('main')).toContainText('Public backstory', { timeout: 10000 })
    await expect(dmPage.locator('main')).not.toContainText('DM-only information')

    await dmContext.close()
  })

  test('player cannot see secret block content on the character page', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Secret DM2')
    await createCampaign(dmPage, `Secret Char Camp2 ${uid()}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create character with secret content
    const charRes = await apiFetch(dmPage, `/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: {
        name: 'Hidden Hero',
        content: 'Public text.\n\n:::secret{.dm}\nPlayer must not see this.\n:::\n',
        visibility: 'members',
      },
    })
    const charSlug = (charRes as Record<string, unknown>).slug as string

    // Invite and join as player
    const inviteRes = await apiFetch(dmPage, `/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      body: { role: 'player' },
    })

    const playerContext = await browser.newContext()
    const playerPage = await playerContext.newPage()
    await registerAndLogin(playerPage, 'Curious Player')
    await apiFetch(playerPage, `/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: { token: (inviteRes as Record<string, unknown>).token },
    })

    // Player navigates to the character page — secret must NOT appear
    await playerPage.goto(`${BASE}/campaigns/${campaignId}/characters/${charSlug}`)
    await playerPage.waitForLoadState('networkidle')
    await expect(playerPage.locator('main')).toContainText('Public text', { timeout: 10000 })
    await expect(playerPage.locator('main')).not.toContainText('Player must not see this')

    // Player cannot abuse preview_as=dm in the URL to see secrets
    await playerPage.goto(`${BASE}/campaigns/${campaignId}/characters/${charSlug}?preview_as=dm`)
    await playerPage.waitForLoadState('networkidle')
    await expect(playerPage.locator('main')).not.toContainText('Player must not see this')

    await dmContext.close()
    await playerContext.close()
  })
})
