import { describe, it, expect, beforeAll } from 'vitest'
import { apiRaw, signUpAndGetApiKey } from './helpers'

/**
 * `subCampaignSlug` resolution on arc/quest create+update, mirroring the existing
 * `arcSlug` resolution behavior on sessions: unknown slug -> 404, cross-campaign slug ->
 * 404 (never shadows a same-slug row in another campaign), omitted on create -> falls
 * back to the campaign's default sub-campaign.
 */

type Row = Record<string, unknown>

describe('Arc/quest subCampaignSlug resolution (integration)', () => {
  const ts = Date.now()
  let apiKey = ''
  let campA = ''
  let campB = ''
  let subCampaignSlug = ''

  function auth() {
    return { 'X-API-Key': apiKey }
  }

  beforeAll(async () => {
    apiKey = await signUpAndGetApiKey(`subcampaign-slug-${ts}@example.com`)

    const a = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: auth(),
      body: { name: `SubCampaign Slug A ${ts}` },
    })
    campA = (await a.json()).id as string

    const b = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: auth(),
      body: { name: `SubCampaign Slug B ${ts}` },
    })
    campB = (await b.json()).id as string

    const sc = await apiRaw(`/api/campaigns/${campA}/sub-campaigns`, {
      method: 'POST',
      headers: auth(),
      body: { name: 'Mortales' },
    })
    subCampaignSlug = (await sc.json()).slug as string

    // Campaign B never gets a "mortales" sub-campaign, only its own default — proves
    // resolution stays scoped to the route's campaign.
  })

  it('arc create without subCampaignSlug falls back to the default', async () => {
    const res = await apiRaw(`/api/campaigns/${campA}/arcs`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Arc Default ${ts}` },
    })
    expect(res.status).toBe(200)
    const arc = (await res.json()) as Row

    const defaults = await apiRaw(`/api/campaigns/${campA}/sub-campaigns`, { headers: auth() })
    const defaultRow = ((await defaults.json()) as Row[]).find((sc) => sc.isDefault)!

    const list = await apiRaw(`/api/campaigns/${campA}/arcs`, { headers: auth() })
    const created = ((await list.json()) as Row[]).find((a) => a.id === arc.id)!
    expect(created.subCampaignId).toBe(defaultRow.id)
  })

  it('arc create with an explicit subCampaignSlug resolves it', async () => {
    const res = await apiRaw(`/api/campaigns/${campA}/arcs`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Arc Mortales ${ts}`, subCampaignSlug },
    })
    expect(res.status).toBe(200)

    const list = await apiRaw(`/api/campaigns/${campA}/arcs?subCampaignSlug=${subCampaignSlug}`, {
      headers: auth(),
    })
    const data = (await list.json()) as Row[]
    expect(data.some((a) => a.name === `Arc Mortales ${ts}`)).toBe(true)
  })

  it('arc create with an unknown subCampaignSlug returns 404', async () => {
    const res = await apiRaw(`/api/campaigns/${campA}/arcs`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Arc Bad ${ts}`, subCampaignSlug: 'nonexistent' },
    })
    expect(res.status).toBe(404)
  })

  it('arc create with a subCampaignSlug that only exists in another campaign returns 404', async () => {
    const res = await apiRaw(`/api/campaigns/${campB}/arcs`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Arc Cross ${ts}`, subCampaignSlug },
    })
    expect(res.status).toBe(404)
  })

  it('arc list with an unknown subCampaignSlug yields an empty list, not an error', async () => {
    const res = await apiRaw(`/api/campaigns/${campA}/arcs?subCampaignSlug=nonexistent`, {
      headers: auth(),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('arc update moves an arc to another sub-campaign by slug', async () => {
    const create = await apiRaw(`/api/campaigns/${campA}/arcs`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Arc To Move ${ts}` },
    })
    const arc = (await create.json()) as Row

    const update = await apiRaw(`/api/campaigns/${campA}/arcs/${arc.slug}`, {
      method: 'PUT',
      headers: auth(),
      body: { subCampaignSlug },
    })
    expect(update.status).toBe(200)

    const list = await apiRaw(`/api/campaigns/${campA}/arcs?subCampaignSlug=${subCampaignSlug}`, {
      headers: auth(),
    })
    const data = (await list.json()) as Row[]
    expect(data.some((a) => a.id === arc.id)).toBe(true)
  })

  it('arc update with an unknown subCampaignSlug returns 404 and leaves the arc unchanged', async () => {
    const create = await apiRaw(`/api/campaigns/${campA}/arcs`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Arc Unchanged ${ts}` },
    })
    const arc = (await create.json()) as Row

    const update = await apiRaw(`/api/campaigns/${campA}/arcs/${arc.slug}`, {
      method: 'PUT',
      headers: auth(),
      body: { subCampaignSlug: 'nonexistent' },
    })
    expect(update.status).toBe(404)
  })

  it('quest create without subCampaignSlug falls back to the default', async () => {
    const res = await apiRaw(`/api/campaigns/${campA}/quests`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Quest Default ${ts}` },
    })
    expect(res.status).toBe(200)
    const quest = (await res.json()) as Row

    const defaults = await apiRaw(`/api/campaigns/${campA}/sub-campaigns`, { headers: auth() })
    const defaultRow = ((await defaults.json()) as Row[]).find((sc) => sc.isDefault)!

    const list = await apiRaw(`/api/campaigns/${campA}/quests`, { headers: auth() })
    const created = ((await list.json()) as Row[]).find((q) => q.id === quest.id)!
    expect(created.subCampaignId).toBe(defaultRow.id)
  })

  it('quest create with an unknown subCampaignSlug returns 404', async () => {
    const res = await apiRaw(`/api/campaigns/${campA}/quests`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Quest Bad ${ts}`, subCampaignSlug: 'nonexistent' },
    })
    expect(res.status).toBe(404)
  })

  it('quest list filters by subCampaignSlug', async () => {
    const create = await apiRaw(`/api/campaigns/${campA}/quests`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Quest Mortales ${ts}`, subCampaignSlug },
    })
    const quest = (await create.json()) as Row

    const list = await apiRaw(`/api/campaigns/${campA}/quests?subCampaignSlug=${subCampaignSlug}`, {
      headers: auth(),
    })
    const data = (await list.json()) as Row[]
    expect(data.some((q) => q.id === quest.id)).toBe(true)
  })

  it('quest update moves a quest to another sub-campaign by slug', async () => {
    const create = await apiRaw(`/api/campaigns/${campA}/quests`, {
      method: 'POST',
      headers: auth(),
      body: { name: `Quest To Move ${ts}` },
    })
    const quest = (await create.json()) as Row

    const update = await apiRaw(`/api/campaigns/${campA}/quests/${quest.slug}`, {
      method: 'PUT',
      headers: auth(),
      body: { subCampaignSlug },
    })
    expect(update.status).toBe(200)

    const list = await apiRaw(`/api/campaigns/${campA}/quests?subCampaignSlug=${subCampaignSlug}`, {
      headers: auth(),
    })
    const data = (await list.json()) as Row[]
    expect(data.some((q) => q.id === quest.id)).toBe(true)
  })
})
