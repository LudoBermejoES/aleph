/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const res = await apiRaw(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
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

describe('Sessions and arcs are relatable entities (integration)', () => {
  const ts = Date.now()
  const email = `sess-arc-rel-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'sess-arc-rel-key')
    apiKey = keyData.key
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Session Arc Relations Test ${ts}` },
    })
    campaignId = camp.id
  })

  it('session creation registers a mirror entity with type "session"', async () => {
    const session = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: `Session Alpha ${ts}` },
    })

    const entity = await api(`/api/campaigns/${campaignId}/entities/${session.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entity.type).toBe('session')
    expect(entity.name).toBe(`Session Alpha ${ts}`)
    expect(entity.id).toBe(session.id)
  })

  it('arc creation registers a mirror entity with type "arc"', async () => {
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Arc Alpha ${ts}` },
    })

    const entity = await api(`/api/campaigns/${campaignId}/entities/${arc.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entity.type).toBe('arc')
    expect(entity.name).toBe(`Arc Alpha ${ts}`)
    expect(entity.id).toBe(arc.id)
  })

  it('a session name colliding with an existing entity gets a de-duplicated slug', async () => {
    const name = `Colliding Session Name ${ts}`
    const location = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name, subtype: 'town' },
    })

    const session = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: name },
    })

    expect(session.slug).not.toBe(location.slug)
  })

  it('a relation can be created between a session and a character', async () => {
    const session = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: `Session With Character ${ts}` },
    })
    const character = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Present Character ${ts}` },
    })

    const relation = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        sourceEntityId: session.id,
        targetEntityId: character.entityId,
        forwardLabel: 'contó con',
        reverseLabel: 'participó en',
      },
    })
    expect(relation).toHaveProperty('id')

    const list = await api(
      `/api/campaigns/${campaignId}/relations?entity_id=${encodeURIComponent(session.id)}`,
      { headers: { 'X-API-Key': apiKey } },
    )
    expect(list.some((r: Record<string, unknown>) => r.targetEntityId === character.entityId)).toBe(
      true,
    )
  })

  it('a relation can be created between a session and an arc', async () => {
    const session = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: `Session In Arc ${ts}` },
    })
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Containing Arc ${ts}` },
    })

    const relation = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        sourceEntityId: session.id,
        targetEntityId: arc.id,
        forwardLabel: 'pertenece a',
        reverseLabel: 'incluye la sesión',
      },
    })
    expect(relation).toHaveProperty('id')
  })

  it('a relation can be created between an arc and a location', async () => {
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Arc With Location ${ts}` },
    })
    const location = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Arc Location ${ts}`, subtype: 'building' },
    })

    const relation = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        sourceEntityId: arc.id,
        targetEntityId: location.id,
        forwardLabel: 'parte de',
        reverseLabel: 'es el hogar de la cábala durante',
      },
    })
    expect(relation).toHaveProperty('id')
  })

  it('a player cannot create a relation involving a session or an arc', async () => {
    const session = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: `Restricted Session ${ts}` },
    })
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Restricted Arc ${ts}` },
    })

    const playerEmail = `sess-arc-rel-player-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'sess-arc-rel-player-key')
    const playerApiKey = playerKeyData.key

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const playerCsrfMatch = playerCookie.match(/csrf_token=([^;]+)/)
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': playerCsrfMatch?.[1] || '' },
      body: { token: invite.token },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': playerApiKey },
      body: { sourceEntityId: session.id, targetEntityId: arc.id },
    })
    expect(res.status).toBe(403)
  })

  it('a relation between entities in different campaigns is rejected', async () => {
    const session = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: `Local Session ${ts}` },
    })
    const otherCampaign = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Other Campaign ${ts}` },
    })
    const foreignArc = await api(`/api/campaigns/${otherCampaign.id}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Foreign Arc ${ts}` },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { sourceEntityId: session.id, targetEntityId: foreignArc.id },
    })
    expect(res.status).toBe(400)
  })

  it('renaming a session updates its mirror entity name', async () => {
    const session = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: `Original Session Name ${ts}` },
    })

    await api(`/api/campaigns/${campaignId}/sessions/${session.slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { title: `Renamed Session ${ts}` },
    })

    const entity = await api(`/api/campaigns/${campaignId}/entities/${session.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entity.name).toBe(`Renamed Session ${ts}`)
  })

  it('renaming an arc updates its mirror entity name', async () => {
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Original Arc Name ${ts}` },
    })

    await api(`/api/campaigns/${campaignId}/arcs/${arc.slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Renamed Arc ${ts}` },
    })

    const entity = await api(`/api/campaigns/${campaignId}/entities/${arc.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entity.name).toBe(`Renamed Arc ${ts}`)
  })

  it('deleting a session removes its mirror entity and cascades its relations, without touching an unrelated relation', async () => {
    const session = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: `Doomed Session ${ts}` },
    })
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Survivor Arc ${ts}` },
    })
    const character = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Bystander Character ${ts}` },
    })

    await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { sourceEntityId: session.id, targetEntityId: character.entityId },
    })
    await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { sourceEntityId: arc.id, targetEntityId: character.entityId },
    })

    const delRes = await apiRaw(`/api/campaigns/${campaignId}/sessions/${session.slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)

    const entityRes = await apiRaw(`/api/campaigns/${campaignId}/entities/${session.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entityRes.status).toBe(404)

    const list = await api(
      `/api/campaigns/${campaignId}/relations?entity_id=${encodeURIComponent(character.entityId)}`,
      { headers: { 'X-API-Key': apiKey } },
    )
    expect(list).toHaveLength(1)
    expect(list[0].sourceEntityId).toBe(arc.id)
  })

  it('deleting an arc removes its mirror entity and cascades its relations', async () => {
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Doomed Arc ${ts}` },
    })
    const location = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Doomed Arc Location ${ts}`, subtype: 'building' },
    })

    await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { sourceEntityId: arc.id, targetEntityId: location.id },
    })

    const delRes = await apiRaw(`/api/campaigns/${campaignId}/arcs/${arc.slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)

    const entityRes = await apiRaw(`/api/campaigns/${campaignId}/entities/${arc.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entityRes.status).toBe(404)

    const list = await api(
      `/api/campaigns/${campaignId}/relations?entity_id=${encodeURIComponent(location.id)}`,
      { headers: { 'X-API-Key': apiKey } },
    )
    expect(list).toEqual([])
  })
})
