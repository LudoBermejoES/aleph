import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Relationship Graph (integration)', () => {
  const email = `rel-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let entity1Id = ''
  let entity2Id = ''
  let relationId = ''
  let relationTypeId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Rel Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Rel Test ${Date.now()}` } })
    campaignId = (await camp.json()).id

    // Create two entities
    const e1 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Strahd', type: 'character', content: '# Strahd' },
    })
    entity1Id = (await e1.json()).id

    const e2 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Ireena', type: 'character', content: '# Ireena' },
    })
    entity2Id = (await e2.json()).id

    // Get a relation type
    const types = await api(`/api/campaigns/${campaignId}/relation-types`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const typeList = await types.json()
    relationTypeId = typeList.find((t: any) => t.slug === 'enemy')?.id
  })

  it('GET relation-types returns 17 built-in types', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relation-types`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data).toHaveLength(17)
    expect(data.every((t: any) => t.isBuiltin || t.is_builtin)).toBe(true)
  })

  it('POST creates relation between entities', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        sourceEntityId: entity1Id,
        targetEntityId: entity2Id,
        relationTypeId,
        forwardLabel: 'enemy of',
        reverseLabel: 'enemy of',
        attitude: -80,
        description: 'Mortal enemies',
      },
    })
    expect(res.status).toBe(200)
    relationId = (await res.json()).id
    expect(relationId).toBeDefined()
  })

  it('GET entity-centered relations returns correct labels', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relations?entity_id=${entity1Id}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(1)
    const rel = data.find((r: any) => r.id === relationId)
    expect(rel.label).toBe('enemy of')
    expect(rel.relatedEntityId).toBe(entity2Id)
  })

  it('GET from target perspective returns reverse label', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relations?entity_id=${entity2Id}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    const rel = data.find((r: any) => r.id === relationId)
    expect(rel.label).toBe('enemy of') // symmetric
    expect(rel.relatedEntityId).toBe(entity1Id)
  })

  it('PUT updates attitude score', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relations/${relationId}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { attitude: -100 },
    })
    expect(res.status).toBe(200)
  })

  it('GET graph returns nodes and edges', async () => {
    const res = await api(`/api/campaigns/${campaignId}/graph`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Object.keys(data.nodes).length).toBeGreaterThanOrEqual(2)
    expect(Object.keys(data.edges).length).toBeGreaterThanOrEqual(1)
    const edge = Object.values(data.edges)[0] as any
    expect(edge.color).toBeDefined()
    expect(edge.attitude).toBeDefined()
  })

  it('POST custom relation type', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relation-types`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { forwardLabel: 'protects', reverseLabel: 'protected by' },
    })
    expect(res.status).toBe(200)
  })

  it('relation with non-existent entity returns 404', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        sourceEntityId: 'nonexistent-id',
        targetEntityId: entity2Id,
        relationTypeId,
        forwardLabel: 'test',
        reverseLabel: 'test',
      },
    })
    expect(res.status).toBe(404)
  })

  it('builtin relation type cannot be modified', async () => {
    const types = await api(`/api/campaigns/${campaignId}/relation-types`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const builtinType = (await types.json()).find((t: any) => t.slug === 'ally')

    const res = await api(`/api/campaigns/${campaignId}/relation-types/${builtinType.id}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { forwardLabel: 'hacked' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE removes relation', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relations/${relationId}`, {
      method: 'DELETE', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
  })
})
