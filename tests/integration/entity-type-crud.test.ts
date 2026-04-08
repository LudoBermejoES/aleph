/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  // Trigger CSRF token generation
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

async function apiOk(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const res = await api(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

describe('Entity Type CRUD (integration)', () => {
  const ts = Date.now()
  const email = `entity-type-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let typeId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'entity-type-key')
    apiKey = keyData.key

    const camp = await apiOk('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Entity Type CRUD Test ${ts}` },
    })
    campaignId = camp.id
  })

  it('POST entity type returns id, slug, and name', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entity-types`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Faction', icon: '⚔️' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('slug')
    expect(data.name).toBe('Faction')
    typeId = data.id
  })

  it('GET entity types includes the created type', async () => {
    const types = await apiOk(`/api/campaigns/${campaignId}/entity-types`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(Array.isArray(types)).toBe(true)
    const found = types.find((t: Record<string, unknown>) => t.id === typeId)
    expect(found).toBeDefined()
    expect(found.name).toBe('Faction')
  })

  it('PUT entity type updates name and returns success', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entity-types/${typeId}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Faction Updated' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify updated
    const types = await apiOk(`/api/campaigns/${campaignId}/entity-types`, {
      headers: { 'X-API-Key': apiKey },
    })
    const found = types.find((t: Record<string, unknown>) => t.id === typeId)
    expect(found?.name).toBe('Faction Updated')
  })

  it('DELETE entity type with no entities in use returns 200', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entity-types/${typeId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify gone
    const types = await apiOk(`/api/campaigns/${campaignId}/entity-types`, {
      headers: { 'X-API-Key': apiKey },
    })
    const found = types.find((t: Record<string, unknown>) => t.id === typeId)
    expect(found).toBeUndefined()
  })

  it('DELETE entity type that is in use by an entity returns 409', async () => {
    // Create a new custom entity type
    const created = await apiOk(`/api/campaigns/${campaignId}/entity-types`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'UsedType', icon: '🏰' },
    })
    const usedTypeId = created.id
    const usedTypeSlug = created.slug

    // Create an entity using that type's slug
    await apiOk(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Test Entity', type: usedTypeSlug },
    })

    // Attempt to delete the entity type — should 409
    const res = await api(`/api/campaigns/${campaignId}/entity-types/${usedTypeId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(409)
  })

  it('DELETE builtin entity type returns 400', async () => {
    // Find a builtin type from the list
    const types = await apiOk(`/api/campaigns/${campaignId}/entity-types`, {
      headers: { 'X-API-Key': apiKey },
    })
    const builtin = types.find(
      (t: Record<string, unknown>) => t.isBuiltin === true || t.is_builtin === true,
    )
    expect(builtin).toBeDefined()

    const res = await api(`/api/campaigns/${campaignId}/entity-types/${builtin.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(400)
  })

  it('PUT entity type by player returns 403', async () => {
    const playerEmail = `entity-type-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'et-player-put-key')
    const playerApiKey = playerKeyData.key

    const created = await apiOk(`/api/campaigns/${campaignId}/entity-types`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'ProtectedType' },
    })

    const invite = await apiOk(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/entity-types/${created.id}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { name: 'Should Fail' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE entity type by player returns 403', async () => {
    const playerEmail = `entity-type-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'et-player-del-key')
    const playerApiKey = playerKeyData.key

    const created = await apiOk(`/api/campaigns/${campaignId}/entity-types`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'DeleteProtectedType' },
    })

    const invite = await apiOk(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/entity-types/${created.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
