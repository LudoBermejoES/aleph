import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Graph API — relationTypeSlug and organizations (12.8-12.10)', () => {
  const email = `graph-api-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let entity1Id = ''
  let entity2Id = ''
  let relationTypeId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Graph API Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { name: `Graph API Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create two entities
    const e1 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Arya', type: 'character', content: '# Arya' },
    })
    entity1Id = (await e1.json()).id

    const e2 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Bran', type: 'character', content: '# Bran' },
    })
    entity2Id = (await e2.json()).id

    // Get the 'ally' relation type
    const types = await api(`/api/campaigns/${campaignId}/relation-types`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const typeList = await types.json()
    relationTypeId = typeList.find((t: any) => t.slug === 'ally')?.id

    // Create a relation
    await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        sourceEntityId: entity1Id,
        targetEntityId: entity2Id,
        relationTypeId,
        forwardLabel: 'allies with',
        reverseLabel: 'allied by',
        attitude: 80,
      },
    })
  })

  // 12.8: graph edges include relationTypeSlug
  it('GET /api/campaigns/{id}/graph — each edge includes relationTypeSlug', async () => {
    const res = await api(`/api/campaigns/${campaignId}/graph`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    const edges = Object.values(data.edges) as any[]
    expect(edges.length).toBeGreaterThanOrEqual(1)
    for (const edge of edges) {
      expect(typeof edge.relationTypeSlug).toBe('string')
      expect(edge.relationTypeSlug.length).toBeGreaterThan(0)
    }
    // The ally relation type slug should be returned
    const allyEdge = edges.find((e: any) => e.relationTypeSlug === 'ally')
    expect(allyEdge).toBeDefined()
  })

  // 12.9: graph nodes include organizations array
  it('GET /api/campaigns/{id}/graph — each node includes organizations array', async () => {
    const res = await api(`/api/campaigns/${campaignId}/graph`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    const nodes = Object.values(data.nodes) as any[]
    expect(nodes.length).toBeGreaterThanOrEqual(2)
    for (const node of nodes) {
      expect(Array.isArray(node.organizations)).toBe(true)
    }
  })

  // 12.10: unauthenticated request returns 401
  it('GET /api/campaigns/{id}/graph — unauthenticated returns 401', async () => {
    const res = await api(`/api/campaigns/${campaignId}/graph`, {
      method: 'GET',
      // no Cookie header
    })
    expect(res.status).toBe(401)
  })
})
