import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function getCsrfToken(sessionCookie: string): Promise<string> {
  const res = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = res.headers.get('set-cookie') || ''
  const match = setCookie.match(/csrf_token=([^;]+)/)
  return match?.[1] || ''
}

function withCsrf(cookie: string, csrfToken: string) {
  return { Cookie: `${cookie}; csrf_token=${csrfToken}`, 'X-CSRF-Token': csrfToken }
}

describe('Graph API — relationTypeSlug and organizations (12.8-12.10)', () => {
  const email = `graph-api-test-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
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
    csrfToken = await getCsrfToken(cookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: `Graph API Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create two entities
    const e1 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'Arya', type: 'character', content: '# Arya' },
    })
    entity1Id = (await e1.json()).id

    const e2 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'Bran', type: 'character', content: '# Bran' },
    })
    entity2Id = (await e2.json()).id

    // Get the 'ally' relation type
    const types = await api(`/api/campaigns/${campaignId}/relation-types`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const typeList = await types.json()
    relationTypeId = typeList.find((t: Record<string, unknown>) => t.slug === 'ally')?.id

    // Create a relation
    await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
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
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    const edges = Object.values(data.edges) as Record<string, unknown>[]
    expect(edges.length).toBeGreaterThanOrEqual(1)
    for (const edge of edges) {
      expect(typeof edge.relationTypeSlug).toBe('string')
      expect(edge.relationTypeSlug.length).toBeGreaterThan(0)
    }
    // The ally relation type slug should be returned
    const allyEdge = edges.find((e: Record<string, unknown>) => e.relationTypeSlug === 'ally')
    expect(allyEdge).toBeDefined()
  })

  // 12.9: graph nodes include organizations array
  it('GET /api/campaigns/{id}/graph — each node includes organizations array', async () => {
    const res = await api(`/api/campaigns/${campaignId}/graph`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    const nodes = Object.values(data.nodes) as Record<string, unknown>[]
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

describe('Graph API — node visibility filtering (enforce-entity-visibility)', () => {
  function withCsrfHeader(cookie: string) {
    const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
    return { Cookie: cookie, 'X-CSRF-Token': csrfMatch?.[1] || '' }
  }

  async function signUpAndGetCookie(email: string, password: string, name: string) {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
    const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
    const cookies = res.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
    const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
    const setCookie = getRes.headers.get('set-cookie') || ''
    const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
    const csrfToken = csrfMatch?.[1] || ''
    return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
  }

  it('excludes a dm_only character node (and its edges) from a player, keeps it for the dm', async () => {
    const dmEmail = `graph-vis-dm-${Date.now()}@example.com`
    const dmCookie = await signUpAndGetCookie(dmEmail, 'password123', 'DM User')
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrfHeader(dmCookie),
      body: { name: `Graph Vis Campaign ${Date.now()}` },
    })
    const campId = (await camp.json()).id

    const playerEmail = `graph-vis-player-${Date.now()}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail, 'password123', 'Player User')
    const inviteRes = await api(`/api/campaigns/${campId}/invite`, {
      method: 'POST',
      headers: withCsrfHeader(dmCookie),
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()
    await api(`/api/campaigns/${campId}/join`, {
      method: 'POST',
      headers: withCsrfHeader(playerCookie),
      body: { token },
    })

    const visibleChar = await api(`/api/campaigns/${campId}/characters`, {
      method: 'POST',
      headers: withCsrfHeader(dmCookie),
      body: { name: 'Visible Ally', characterType: 'npc' },
    })
    const visibleId = (await visibleChar.json()).entityId

    const hiddenChar = await api(`/api/campaigns/${campId}/characters`, {
      method: 'POST',
      headers: withCsrfHeader(dmCookie),
      body: { name: 'Hidden Villain', characterType: 'npc', visibility: 'dm_only' },
    })
    const hiddenId = (await hiddenChar.json()).entityId

    const types = await api(`/api/campaigns/${campId}/relation-types`, {
      headers: { Cookie: dmCookie },
    })
    const relationTypeId = (await types.json()).find(
      (t: Record<string, unknown>) => t.slug === 'ally',
    )?.id
    await api(`/api/campaigns/${campId}/relations`, {
      method: 'POST',
      headers: withCsrfHeader(dmCookie),
      body: {
        sourceEntityId: visibleId,
        targetEntityId: hiddenId,
        relationTypeId,
        forwardLabel: 'allies with',
        reverseLabel: 'allied by',
      },
    })

    const playerRes = await api(`/api/campaigns/${campId}/graph`, {
      headers: { Cookie: playerCookie },
    })
    const playerGraph = await playerRes.json()
    expect(playerGraph.nodes[hiddenId]).toBeUndefined()
    expect(playerGraph.nodes[visibleId]).toBeDefined()
    expect(
      Object.values(playerGraph.edges).some(
        (e) => (e as Record<string, unknown>).target === hiddenId,
      ),
    ).toBe(false)

    const dmRes = await api(`/api/campaigns/${campId}/graph`, { headers: { Cookie: dmCookie } })
    const dmGraph = await dmRes.json()
    expect(dmGraph.nodes[hiddenId]).toBeDefined()
    expect(dmGraph.nodes[visibleId]).toBeDefined()
  })
})
