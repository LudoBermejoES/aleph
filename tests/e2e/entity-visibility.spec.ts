import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Entity Visibility', () => {
  test('DM can view dm_only entity, player gets 404', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()

    const dmId = uid()
    await registerAndLogin(dmPage, `DM ${dmId}`)
    await createCampaign(dmPage, `Vis Camp ${dmId}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create dm_only entity via API (with CSRF)
    const entityName = `Secret Entity ${dmId}`
    const createRes = await dmPage.evaluate(
      async ([id, name]: string[]) => {
        const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
        const res = await fetch(`/api/campaigns/${id}/entities`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ name, type: 'lore', visibility: 'dm_only' }),
        })
        return res.json()
      },
      [campaignId, entityName],
    )

    const entitySlug = createRes.slug

    // DM can view entity
    const dmApiRes = await dmPage.evaluate(
      async ([id, slug]: string[]) => {
        const res = await fetch(`/api/campaigns/${id}/entities/${slug}`, { credentials: 'include' })
        return res.status
      },
      [campaignId, entitySlug],
    )
    expect(dmApiRes).toBe(200)

    // Create player account
    const playerContext = await browser.newContext()
    const playerPage = await playerContext.newPage()
    await registerAndLogin(playerPage, `Player ${dmId}`)
    await playerPage.waitForTimeout(500)

    // Invite player via API (DM sends invite, player joins)
    const inviteToken = await dmPage.evaluate(async (id: string) => {
      const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
      const res = await fetch(`/api/campaigns/${id}/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ role: 'player' }),
      })
      const data = await res.json()
      return data.token as string
    }, campaignId)

    await playerPage.evaluate(
      async ([id, token]: string[]) => {
        const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
        await fetch(`/api/campaigns/${id}/join`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ token }),
        })
      },
      [campaignId, inviteToken],
    )

    // Player tries to access dm_only entity — should get 404
    const playerApiRes = await playerPage.evaluate(
      async ([id, slug]: string[]) => {
        const res = await fetch(`/api/campaigns/${id}/entities/${slug}`, { credentials: 'include' })
        return res.status
      },
      [campaignId, entitySlug],
    )
    expect(playerApiRes).toBe(404)

    await dmContext.close()
    await playerContext.close()
  })

  test('DM can toggle visibility and player access changes', async ({ browser }) => {
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()

    const dmId = `tg-${uid()}`
    await registerAndLogin(dmPage, `DM ${dmId}`)
    await createCampaign(dmPage, `Toggle Camp ${dmId}`)
    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]

    // Create entity as members visibility
    const entityName = `Toggle Entity ${dmId}`
    const createRes = await dmPage.evaluate(
      async ([id, name]: string[]) => {
        const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
        const res = await fetch(`/api/campaigns/${id}/entities`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ name, type: 'lore', visibility: 'members' }),
        })
        return res.json()
      },
      [campaignId, entityName],
    )
    const entitySlug = createRes.slug

    // Change to dm_only
    await dmPage.evaluate(
      async ([id, slug]: string[]) => {
        const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
        await fetch(`/api/campaigns/${id}/entities/${slug}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ visibility: 'dm_only' }),
        })
      },
      [campaignId, entitySlug],
    )

    // DM still sees it
    const dmStatus = await dmPage.evaluate(
      async ([id, slug]: string[]) => {
        const res = await fetch(`/api/campaigns/${id}/entities/${slug}`, { credentials: 'include' })
        return res.status
      },
      [campaignId, entitySlug],
    )
    expect(dmStatus).toBe(200)

    await dmContext.close()
  })
})
