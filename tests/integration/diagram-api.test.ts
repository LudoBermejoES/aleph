/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(url: string, opts?: any) {
  return fetch(`${BASE_URL}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(url: string, opts?: any) {
  const res = await apiRaw(url, opts)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${opts?.method ?? 'GET'} ${url} → ${res.status}: ${t}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

function baseHeaders(apiKey: string) {
  return { 'X-API-Key': apiKey }
}

describe('Diagram API (integration)', () => {
  const ts = Date.now()
  const dmEmail = `diag-dm-${ts}@example.com`
  const playerEmail = `diag-player-${ts}@example.com`

  let dmApiKey = ''
  let playerApiKey = ''
  let campaignId = ''
  let diagramId = ''

  beforeAll(async () => {
    const dmCookie = await signUpAndGetCookie(dmEmail)
    const dmKeyData = await createApiKey(dmCookie, 'diag-dm-key')
    dmApiKey = dmKeyData.key

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { name: `Diagram Test Camp ${ts}` },
    })
    campaignId = camp.id

    // Invite and join a player
    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { role: 'player' },
    })
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'diag-player-key')
    playerApiKey = playerKeyData.key
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: baseHeaders(playerApiKey),
      body: { token: invite.token },
    })
  })

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  it('401 without auth on list', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams`)
    expect(res.status).toBe(401)
  })

  it('creates a diagram as DM', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { title: 'Test Diagram', diagramType: 'freeform' },
    })
    expect(data.id).toBeTruthy()
    expect(data.title).toBe('Test Diagram')
    diagramId = data.id
  })

  it('403 for player trying to create diagram', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': playerApiKey },
      body: JSON.stringify({ title: 'Player Diagram' }),
    })
    expect(res.status).toBe(403)
  })

  it('lists diagrams as DM', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams`, {
      headers: baseHeaders(dmApiKey),
    })
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0].id).toBe(diagramId)
  })

  it('lists diagrams as player', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams`, {
      headers: baseHeaders(playerApiKey),
    })
    expect(Array.isArray(data)).toBe(true)
  })

  it('gets single diagram', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams/${diagramId}`, {
      headers: baseHeaders(dmApiKey),
    })
    expect(data.id).toBe(diagramId)
    expect(data.title).toBe('Test Diagram')
  })

  it('updates diagram metadata', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams/${diagramId}`, {
      method: 'PUT',
      headers: baseHeaders(dmApiKey),
      body: { title: 'Updated Title' },
    })
    expect(data.title).toBe('Updated Title')
  })

  // ─── Snapshot ─────────────────────────────────────────────────────────────

  it('404 when no snapshot yet', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(404)
  })

  it('saves and retrieves snapshot', async () => {
    const snapshotPayload = {
      store: { 'shape:test': { id: 'shape:test', type: 'text' } },
      schema: { schemaVersion: 2 },
    }
    await api(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      method: 'PUT',
      headers: baseHeaders(dmApiKey),
      body: snapshotPayload,
    })
    const retrieved = await api(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      headers: baseHeaders(dmApiKey),
    })
    expect(retrieved.snapshot).toBeDefined()
    expect(retrieved.version).toBe(1)
    expect(retrieved.snapshot.store['shape:test']).toBeTruthy()
  })

  it('increments snapshot version', async () => {
    await api(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      method: 'PUT',
      headers: baseHeaders(dmApiKey),
      body: { store: {}, schema: { schemaVersion: 2 } },
    })
    const retrieved = await api(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      headers: baseHeaders(dmApiKey),
    })
    expect(retrieved.version).toBe(2)
  })

  it('403 player cannot save snapshot', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': playerApiKey },
      body: JSON.stringify({ store: {} }),
    })
    expect(res.status).toBe(403)
  })

  it('413 for oversized snapshot', async () => {
    const largeData = 'x'.repeat(6 * 1024 * 1024)
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': dmApiKey },
      body: JSON.stringify({ store: largeData }),
    })
    expect(res.status).toBe(413)
  })

  // ─── Generate ─────────────────────────────────────────────────────────────

  it('422 for generate with no sessions', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': dmApiKey },
      body: JSON.stringify({ type: 'session-timeline' }),
    })
    expect(res.status).toBe(422)
  })

  it('403 player cannot generate diagram', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': playerApiKey },
      body: JSON.stringify({ type: 'session-timeline' }),
    })
    expect(res.status).toBe(403)
  })

  // ─── Entity Search ─────────────────────────────────────────────────────────

  it('returns grouped entity search results', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams/entities`, {
      headers: baseHeaders(dmApiKey),
    })
    expect(data).toHaveProperty('characters')
    expect(data).toHaveProperty('locations')
    expect(data).toHaveProperty('organizations')
    expect(data).toHaveProperty('quests')
    expect(data).toHaveProperty('wiki')
  })

  it('returns empty results for unknown query', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams/entities?q=xyzxyzxyz999`, {
      headers: baseHeaders(dmApiKey),
    })
    const total = Object.values(data).reduce((sum: number, arr: any) => sum + arr.length, 0)
    expect(total).toBe(0)
  })

  // ─── Delete ───────────────────────────────────────────────────────────────

  it('403 player cannot delete diagram', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })

  it('deletes diagram as DM', async () => {
    const data = await api(`/api/campaigns/${campaignId}/diagrams/${diagramId}`, {
      method: 'DELETE',
      headers: baseHeaders(dmApiKey),
    })
    expect(data.success).toBe(true)
  })

  it('404 after deletion', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(404)
  })
})
