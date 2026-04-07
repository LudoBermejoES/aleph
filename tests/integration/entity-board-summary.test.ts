import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetAuth(email: string) {
  await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name: 'BoardSummary Tester', email, password: 'password123' },
  })
  const res = await api('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password: 'password123' },
  })
  const cookies = res.headers.get('set-cookie') || ''
  const sessionMatch = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = sessionMatch ? `better-auth.session_token=${sessionMatch[1]}` : ''
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const fullCookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
  return { cookie: fullCookie, csrfToken }
}

function authHeaders(cookie: string, csrfToken: string) {
  return { Cookie: cookie, 'X-CSRF-Token': csrfToken }
}

describe('boardSummary — entity PUT and graph API (9.2, 9.3)', () => {
  const email = `board-summary-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let entitySlug = ''
  let entity2Slug = ''
  let relationTypeId = ''

  beforeAll(async () => {
    const auth = await signUpAndGetAuth(email)
    cookie = auth.cookie
    csrfToken = auth.csrfToken

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: authHeaders(cookie, csrfToken),
      body: { name: `BoardSummary Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create two entities to relate
    const e1 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: authHeaders(cookie, csrfToken),
      body: { name: 'Alpha', type: 'character' },
    })
    entitySlug = (await e1.json()).slug

    const e2 = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: authHeaders(cookie, csrfToken),
      body: { name: 'Beta', type: 'location' },
    })
    entity2Slug = (await e2.json()).slug

    // Create a relation type so graph has edges
    const rt = await api(`/api/campaigns/${campaignId}/relation-types`, {
      method: 'POST',
      headers: authHeaders(cookie, csrfToken),
      body: { name: 'knows', slug: 'knows', color: '#22c55e' },
    })
    relationTypeId = (await rt.json()).id
  })

  // ─── 9.3: boardSummary accept / reject on entity PUT ─────────────────────

  it('accepts valid boardSummary (≤120 chars)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'PUT',
      headers: authHeaders(cookie, csrfToken),
      body: { boardSummary: 'A short label for the graph card' },
    })
    expect(res.status).toBe(200)
  })

  it('entity GET returns boardSummary after setting it', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.boardSummary).toBe('A short label for the graph card')
  })

  it('rejects boardSummary > 120 chars with 422', async () => {
    const long = 'x'.repeat(121)
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'PUT',
      headers: authHeaders(cookie, csrfToken),
      body: { boardSummary: long },
    })
    expect(res.status).toBe(422)
  })

  it('accepts boardSummary: null (clears it)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'PUT',
      headers: authHeaders(cookie, csrfToken),
      body: { boardSummary: null },
    })
    expect(res.status).toBe(200)
    const getRes = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      headers: { Cookie: cookie },
    })
    const data = await getRes.json()
    expect(data.boardSummary).toBeNull()
  })

  // ─── 9.2: boardSummary in graph API response ─────────────────────────────

  it('graph API includes boardSummary on nodes after setting it', async () => {
    // Set boardSummary on entity
    await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'PUT',
      headers: authHeaders(cookie, csrfToken),
      body: { boardSummary: 'Graph label for Alpha' },
    })

    // Need a relation so entities show up in graph
    const e1Res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      headers: { Cookie: cookie },
    })
    const e1Data = await e1Res.json()
    const e2Res = await api(`/api/campaigns/${campaignId}/entities/${entity2Slug}`, {
      headers: { Cookie: cookie },
    })
    const e2Data = await e2Res.json()

    await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: authHeaders(cookie, csrfToken),
      body: {
        sourceEntityId: e1Data.id,
        targetEntityId: e2Data.id,
        relationTypeId,
        forwardLabel: 'knows',
      },
    })

    const graphRes = await api(`/api/campaigns/${campaignId}/graph`, {
      headers: { Cookie: cookie },
    })
    expect(graphRes.status).toBe(200)
    const graph = await graphRes.json()

    const alphaNode = (
      Object.values(graph.nodes) as { name: string; boardSummary: string | null }[]
    ).find((n) => n.name === 'Alpha')
    expect(alphaNode).toBeDefined()
    expect(alphaNode!.boardSummary).toBe('Graph label for Alpha')
  })

  it('graph API returns boardSummary: null for nodes without it set', async () => {
    const graphRes = await api(`/api/campaigns/${campaignId}/graph`, {
      headers: { Cookie: cookie },
    })
    const graph = await graphRes.json()
    const betaNode = (
      Object.values(graph.nodes) as { name: string; boardSummary: string | null }[]
    ).find((n) => n.name === 'Beta')
    expect(betaNode).toBeDefined()
    expect(betaNode!.boardSummary).toBeNull()
  })
})
