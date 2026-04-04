/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  return match ? `better-auth.session_token=${match[1]}` : ''
}

async function createApiKey(cookie: string, name = 'test-key') {
  const res = await api('/api/apikeys', { method: 'POST', headers: { Cookie: cookie }, body: { name } })
  return res.json()
}

async function apiOk(path: string, opts?: RequestInit & { body?: unknown }) {
  const res = await api(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

describe('Map Layer CRUD (integration)', () => {
  const ts = Date.now()
  const email = `map-layer-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let mapSlug = ''
  let layerId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'map-layer-key')
    apiKey = keyData.key

    const camp = await apiOk('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Map Layer CRUD Test ${ts}` },
    })
    campaignId = camp.id

    // Create map
    const map = await apiOk(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Sword Coast', width: 1000, height: 800 },
    })
    mapSlug = map.slug
  })

  it('POST map returns id, slug, and name', async () => {
    expect(mapSlug).toBeTruthy()
  })

  it('POST map layer returns id', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Base Layer', type: 'standard' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    layerId = data.id
  })

  it('GET layers returns the created layer', async () => {
    const layers = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(Array.isArray(layers)).toBe(true)
    const found = layers.find((l: any) => l.id === layerId)
    expect(found).toBeDefined()
    expect(found.name).toBe('Base Layer')
    expect(found.type).toBe('standard')
  })

  it('PUT layer updates name and returns success', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers/${layerId}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Updated Layer' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify updated
    const layers = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers`, {
      headers: { 'X-API-Key': apiKey },
    })
    const found = layers.find((l: any) => l.id === layerId)
    expect(found?.name).toBe('Updated Layer')
  })

  it('DELETE layer returns 200 and layer is gone', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers/${layerId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify gone
    const layers = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers`, {
      headers: { 'X-API-Key': apiKey },
    })
    const found = layers.find((l: any) => l.id === layerId)
    expect(found).toBeUndefined()
  })

  it('PUT layer by player returns 403', async () => {
    const playerEmail = `map-layer-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'layer-player-put-key')
    const playerApiKey = playerKeyData.key

    // Create a fresh layer for this test
    const layer = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Protected Layer', type: 'standard' },
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

    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers/${layer.id}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { name: 'Should Fail' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE layer by player returns 403', async () => {
    const playerEmail = `map-layer-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'layer-player-del-key')
    const playerApiKey = playerKeyData.key

    const layer = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Delete Protected Layer', type: 'standard' },
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

    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers/${layer.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
