import { describe, it, expect, beforeAll } from 'vitest'
import { apiRaw, signUpAndGetApiKey } from './helpers'

async function api(url: string, opts?: Parameters<typeof apiRaw>[1]) {
  const res = await apiRaw(url, opts)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${opts?.method ?? 'GET'} ${url} → ${res.status}: ${t}`)
  }
  if (res.status === 204) return null
  return res.json()
}

function authH(apiKey: string) {
  return { 'X-API-Key': apiKey }
}

describe('Diagram entity sync — batch endpoint and reflow (diagram-enhancements)', () => {
  const ts = Date.now()
  const dmEmail = `sync-dm-${ts}@example.com`
  const playerEmail = `sync-player-${ts}@example.com`

  let dmApiKey = ''
  let playerApiKey = ''
  let campaignId = ''
  let entityId1 = ''
  let entityId2 = ''

  beforeAll(async () => {
    dmApiKey = await signUpAndGetApiKey(dmEmail)
    playerApiKey = await signUpAndGetApiKey(playerEmail)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: authH(dmApiKey),
      body: { name: `Sync Test Camp ${ts}` },
    })
    campaignId = camp.id

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: authH(dmApiKey),
      body: { role: 'player' },
    })
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: authH(playerApiKey),
      body: { token: invite.token },
    })

    const e1 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: authH(dmApiKey),
      body: { name: 'Aldric', type: 'character' },
    })
    entityId1 = e1.id

    const e2 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: authH(dmApiKey),
      body: { name: 'The Tavern', type: 'location' },
    })
    entityId2 = e2.id
  })

  // ─── Batch endpoint ────────────────────────────────────────────────────────

  it('401 without auth on batch', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/diagrams/entities/batch?ids=${entityId1}`,
    )
    expect(res.status).toBe(401)
  })

  it('returns entity data for valid IDs', async () => {
    const data = await api(
      `/api/campaigns/${campaignId}/diagrams/entities/batch?ids=${entityId1},${entityId2}`,
      { headers: authH(dmApiKey) },
    )
    expect(data[entityId1]).toBeDefined()
    expect(data[entityId1].name).toBe('Aldric')
    expect(data[entityId2]).toBeDefined()
    expect(data[entityId2].name).toBe('The Tavern')
  })

  it('omits unknown IDs silently', async () => {
    const fakeId = 'non-existent-id-xyz'
    const data = await api(
      `/api/campaigns/${campaignId}/diagrams/entities/batch?ids=${entityId1},${fakeId}`,
      { headers: authH(dmApiKey) },
    )
    expect(data[entityId1]).toBeDefined()
    expect(data[fakeId]).toBeUndefined()
  })

  it('returns empty object for empty ids param', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams/entities/batch?ids=`, {
      headers: authH(dmApiKey),
    })
    expect(data).toEqual({})
  })

  it('player can access batch endpoint', async () => {
    const data = await api(
      `/api/campaigns/${campaignId}/diagrams/entities/batch?ids=${entityId1}`,
      { headers: authH(playerApiKey) },
    )
    expect(data[entityId1]).toBeDefined()
  })

  it('batch response includes required fields', async () => {
    const data = await api(
      `/api/campaigns/${campaignId}/diagrams/entities/batch?ids=${entityId1}`,
      { headers: authH(dmApiKey) },
    )
    const entity = data[entityId1]
    expect(entity).toHaveProperty('id')
    expect(entity).toHaveProperty('name')
    expect(entity).toHaveProperty('type')
    expect(entity).toHaveProperty('slug')
  })

  // ─── Reflow endpoint ────────────────────────────────────────────────────────

  it('reflow returns positions for entity IDs', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams/reflow`, {
      method: 'POST',
      headers: authH(dmApiKey),
      body: { entityIds: [entityId1, entityId2], diagramType: 'entity-graph' },
    })
    expect(data.positions).toBeDefined()
    expect(data.positions[entityId1]).toHaveProperty('x')
    expect(data.positions[entityId1]).toHaveProperty('y')
    expect(data.positions[entityId2]).toHaveProperty('x')
  })

  it('403 player cannot call reflow', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/reflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': playerApiKey },
      body: { entityIds: [entityId1], diagramType: 'entity-graph' },
    })
    expect(res.status).toBe(403)
  })

  it('reflow returns empty positions for empty entityIds', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams/reflow`, {
      method: 'POST',
      headers: authH(dmApiKey),
      body: { entityIds: [], diagramType: 'entity-graph' },
    })
    expect(data.positions).toEqual({})
  })

  // ─── Graph endpoint (used by syncRelations) ─────────────────────────────────

  it('graph endpoint returns edges structure for syncRelations', async () => {
    // Create a relation between entityId1 and entityId2
    await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: authH(dmApiKey),
      body: { sourceEntityId: entityId1, targetEntityId: entityId2, label: 'ally' },
    })

    const data = await api(`/api/campaigns/${campaignId}/graph`, {
      headers: authH(dmApiKey),
    })

    expect(data).toHaveProperty('edges')
    const edges = Object.values(data.edges) as { source: string; target: string; label?: string }[]
    const edge = edges.find(
      (e) =>
        (e.source === entityId1 && e.target === entityId2) ||
        (e.source === entityId2 && e.target === entityId1),
    )
    expect(edge).toBeDefined()
    expect(edge).toHaveProperty('source')
    expect(edge).toHaveProperty('target')
  })

  it('graph endpoint 401 without auth', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/graph`)
    expect(res.status).toBe(401)
  })

  it('player can access graph endpoint', async () => {
    const data = await api(`/api/campaigns/${campaignId}/graph`, {
      headers: authH(playerApiKey),
    })
    expect(data).toHaveProperty('edges')
  })
})
