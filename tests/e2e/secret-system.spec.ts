import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

/**
 * E2E tests for the secrets system:
 * - Preview-as-player mode
 * - Secret reveal/unreveal (API-level via evaluate)
 * - Secret notes (DM only)
 */

test.describe('Secrets System - Preview as Player (task 9.11)', () => {
  test('DM can preview entity content as player via render endpoint', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Preview DM')
    await createCampaign(dmPage, `Preview Camp ${uid()}`)

    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create entity with a secret dm block
    const entityRes = await dmPage.evaluate(async ([id]) => {
      const r = await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Preview Test Entity',
          type: 'note',
          content: '# Public\n\nPublic content.\n\n:::secret{.dm}\nDM only secret.\n:::\n',
          visibility: 'members',
        }),
      })
      return r.json()
    }, [campaignId])
    const entitySlug = (entityRes as any).slug

    // DM renders without preview — should see dm secret block
    const dmRender = await dmPage.evaluate(async ([id, slug]) => {
      const r = await fetch(`/api/campaigns/${id}/entities/${slug}/render`, { credentials: 'include' })
      return r.json()
    }, [campaignId, entitySlug])
    expect((dmRender as any).previewMode).toBe(false)
    expect((dmRender as any).content).toContain('DM only secret')

    // DM renders with preview_as=player — secret stripped
    const previewRender = await dmPage.evaluate(async ([id, slug]) => {
      const r = await fetch(`/api/campaigns/${id}/entities/${slug}/render?preview_as=player`, { credentials: 'include' })
      return r.json()
    }, [campaignId, entitySlug])
    expect((previewRender as any).previewMode).toBe(true)
    expect((previewRender as any).effectiveRole).toBe('player')
    expect((previewRender as any).content).not.toContain('DM only secret')
    expect((previewRender as any).content).toContain('Public content')

    await dmContext.close()
  })
})

test.describe('Secrets System - Reveal API (task 9.12)', () => {
  test('DM reveals secret block, and render with revealedBlockIds shows content', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Reveal DM')
    await createCampaign(dmPage, `Reveal Camp ${uid()}`)

    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create entity with a named secret block
    const entityRes = await dmPage.evaluate(async ([id]) => {
      const r = await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Reveal Test Entity',
          type: 'note',
          content: '# Story\n\n:::secret{.dm #clue-1}\nThe murderer is the butler.\n:::\n',
          visibility: 'members',
        }),
      })
      return r.json()
    }, [campaignId])
    const entitySlug = (entityRes as any).slug

    // Invite a player
    const inviteRes = await dmPage.evaluate(async (id) => {
      const r = await fetch(`/api/campaigns/${id}/invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'player' }),
      })
      return r.json()
    }, campaignId)

    // Player joins
    const playerContext = await browser.newContext()
    const playerPage = await playerContext.newPage()
    await registerAndLogin(playerPage, 'Reveal Player')
    await playerPage.evaluate(async ([id, token]) => {
      await fetch(`/api/campaigns/${id}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    }, [campaignId, (inviteRes as any).token])

    // Before reveal: DM previews as player — block hidden
    const beforeReveal = await dmPage.evaluate(async ([id, slug]) => {
      const r = await fetch(`/api/campaigns/${id}/entities/${slug}/render?preview_as=player`, { credentials: 'include' })
      return r.json()
    }, [campaignId, entitySlug])
    expect((beforeReveal as any).content).not.toContain('butler')

    // DM reveals block clue-1
    const revealRes = await dmPage.evaluate(async ([id, slug]) => {
      const r = await fetch(`/api/campaigns/${id}/entities/${slug}/secrets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId: 'clue-1' }),
        credentials: 'include',
      })
      return r.json()
    }, [campaignId, entitySlug])
    expect((revealRes as any).revealed).toBe(true)

    // After reveal: DM previews as player — block now shown
    const afterReveal = await dmPage.evaluate(async ([id, slug]) => {
      const r = await fetch(`/api/campaigns/${id}/entities/${slug}/render?preview_as=player`, { credentials: 'include' })
      return r.json()
    }, [campaignId, entitySlug])
    expect((afterReveal as any).content).toContain('butler')

    // GET /secrets returns the revealed block
    const secretsList = await dmPage.evaluate(async ([id, slug]) => {
      const r = await fetch(`/api/campaigns/${id}/entities/${slug}/secrets`, { credentials: 'include' })
      return r.json()
    }, [campaignId, entitySlug])
    expect(Array.isArray(secretsList)).toBe(true)
    const found = (secretsList as any[]).find(s => s.blockId === 'clue-1')
    expect(found).toBeDefined()

    await dmContext.close()
    await playerContext.close()
  })
})

test.describe('Secrets System - Secret Notes (task 9.13)', () => {
  test('DM can write secret notes, player cannot access them', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'Notes DM')
    await createCampaign(dmPage, `Notes Camp ${uid()}`)

    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create entity
    const entityRes = await dmPage.evaluate(async ([id]) => {
      const r = await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Notes Entity', type: 'note', visibility: 'members' }),
      })
      return r.json()
    }, [campaignId])
    const entitySlug = (entityRes as any).slug

    // DM writes secret notes
    const putRes = await dmPage.evaluate(async ([id, slug]) => {
      const r = await fetch(`/api/campaigns/${id}/entities/${slug}/secret-notes`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'The villain is hiding at the old mill.' }),
        credentials: 'include',
      })
      return r.json()
    }, [campaignId, entitySlug])
    expect((putRes as any).content).toBe('The villain is hiding at the old mill.')

    // DM reads them back
    const getRes = await dmPage.evaluate(async ([id, slug]) => {
      const r = await fetch(`/api/campaigns/${id}/entities/${slug}/secret-notes`, { credentials: 'include' })
      return r.json()
    }, [campaignId, entitySlug])
    expect((getRes as any).content).toBe('The villain is hiding at the old mill.')

    // Player cannot access them
    const inviteRes = await dmPage.evaluate(async (id) => {
      const r = await fetch(`/api/campaigns/${id}/invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'player' }),
      })
      return r.json()
    }, campaignId)

    const playerContext = await browser.newContext()
    const playerPage = await playerContext.newPage()
    await registerAndLogin(playerPage, 'Notes Player')
    await playerPage.evaluate(async ([id, token]) => {
      await fetch(`/api/campaigns/${id}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    }, [campaignId, (inviteRes as any).token])

    // Player tries to read secret notes — should get 403
    const playerRes = await playerPage.evaluate(async ([id, slug]) => {
      const r = await fetch(`/api/campaigns/${id}/entities/${slug}/secret-notes`, { credentials: 'include' })
      return { status: r.status }
    }, [campaignId, entitySlug])
    expect((playerRes as any).status).toBe(403)

    await dmContext.close()
    await playerContext.close()
  })
})
