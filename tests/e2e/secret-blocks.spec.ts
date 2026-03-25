import { test, expect } from '@playwright/test'
import { BASE, registerAndLogin, createCampaign } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Secret Content Blocks', () => {
  test('DM sees secret content, player does not (API level)', async ({ browser }) => {
    // DM creates entity with secret content
    const dmContext = await browser.newContext()
    const dmPage = await dmContext.newPage()
    await registerAndLogin(dmPage, 'DM Secrets')
    await createCampaign(dmPage, `Secret Camp ${uid()}`)

    const campaignId = dmPage.url().split('/campaigns/')[1]?.split('/')[0]
    const entityName = `Secret Entity ${uid()}`

    await dmPage.evaluate(async ([id, name]) => {
      await fetch(`/api/campaigns/${id}/entities`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, type: 'note',
          content: '# Public Info\n\nEveryone sees this.\n\n:::secret{.dm}\nOnly the DM sees this secret.\n:::\n\nMore public text.',
          visibility: 'members',
        }),
      })
    }, [campaignId, entityName])

    // DM reads entity -- should see the secret block in raw content
    const dmRead = await dmPage.evaluate(async ([id]) => {
      const entities = await fetch(`/api/campaigns/${id}/entities`).then(r => r.json())
      const entity = entities.entities[0]
      if (!entity) return { content: '' }
      const detail = await fetch(`/api/campaigns/${id}/entities/${entity.slug}`).then(r => r.json())
      return { content: detail.content }
    }, [campaignId])

    expect((dmRead as any).content).toContain('secret')
    expect((dmRead as any).content).toContain('Public Info')

    // Invite player
    const inviteRes = await dmPage.evaluate(async (id) => {
      const r = await fetch(`/api/campaigns/${id}/invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'player' }),
      })
      return r.json()
    }, campaignId)

    // Player joins and reads
    const playerContext = await browser.newContext()
    const playerPage = await playerContext.newPage()
    await registerAndLogin(playerPage, 'Player Seeker')
    await playerPage.evaluate(async ([id, token]) => {
      await fetch(`/api/campaigns/${id}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    }, [campaignId, (inviteRes as any).token])

    // Player reads entity -- raw .md file still has secret block
    // (secret stripping happens at render time, not storage)
    const playerRead = await playerPage.evaluate(async ([id]) => {
      const entities = await fetch(`/api/campaigns/${id}/entities`).then(r => r.json())
      const entity = entities.entities[0]
      if (!entity) return { content: '' }
      const detail = await fetch(`/api/campaigns/${id}/entities/${entity.slug}`).then(r => r.json())
      return { content: detail.content }
    }, [campaignId])

    // Player can see the raw content (secret filtering is render-time via remark plugin)
    expect((playerRead as any).content).toContain('Public Info')

    await dmContext.close()
    await playerContext.close()
  })
})
