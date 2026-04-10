import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Character secret blocks - preview_as filtering', () => {
  test('DM sees secret content; preview_as=player hides it', async ({ browser }) => {
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
        content:
          '# Background\n\nPublic backstory.\n\n:::secret{.dm}\nThis is DM-only information.\n:::\n',
      },
    })
    const charSlug = (charRes as Record<string, unknown>).slug as string

    // DM fetches without preview — secret block content is visible
    const dmRead = await dmPage.evaluate(
      async ([id, slug]) => {
        const r = await fetch(`/api/campaigns/${id}/characters/${slug}`, {
          credentials: 'include',
        })
        return r.json()
      },
      [campaignId, charSlug],
    )
    expect((dmRead as Record<string, unknown>).content).toContain('DM-only information')
    expect((dmRead as Record<string, unknown>).content).toContain('Public backstory')

    // DM fetches with preview_as=player — secret block stripped
    const previewRead = await dmPage.evaluate(
      async ([id, slug]) => {
        const r = await fetch(`/api/campaigns/${id}/characters/${slug}?preview_as=player`, {
          credentials: 'include',
        })
        return r.json()
      },
      [campaignId, charSlug],
    )
    expect((previewRead as Record<string, unknown>).content).not.toContain('DM-only information')
    expect((previewRead as Record<string, unknown>).content).toContain('Public backstory')

    await dmContext.close()
  })

  test('actual player never sees secret block content', async ({ browser }) => {
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

    // Player reads character — secret block must be stripped
    const playerRead = await playerPage.evaluate(
      async ([id, slug]) => {
        const r = await fetch(`/api/campaigns/${id}/characters/${slug}`, {
          credentials: 'include',
        })
        return r.json()
      },
      [campaignId, charSlug],
    )
    expect((playerRead as Record<string, unknown>).content).not.toContain('Player must not see')
    expect((playerRead as Record<string, unknown>).content).toContain('Public text')

    // Player cannot abuse preview_as to see secrets
    const abusedPreview = await playerPage.evaluate(
      async ([id, slug]) => {
        const r = await fetch(`/api/campaigns/${id}/characters/${slug}?preview_as=dm`, {
          credentials: 'include',
        })
        return r.json()
      },
      [campaignId, charSlug],
    )
    expect((abusedPreview as Record<string, unknown>).content).not.toContain('Player must not see')

    await dmContext.close()
    await playerContext.close()
  })
})
