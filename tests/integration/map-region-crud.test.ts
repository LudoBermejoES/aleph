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
  const res = await api('/api/apikeys', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: { name } })
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

describe('Map Region CRUD (integration)', () => {
  const ts = Date.now()
  const email = `map-region-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let mapSlug = ''
  let regionId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'map-region-key')
    apiKey = keyData.key

    const camp = await apiOk('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Map Region CRUD Test ${ts}` },
    })
    campaignId = camp.id

    // Create map
    const map = await apiOk(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Faerun', width: 2000, height: 1500 },
    })
    mapSlug = map.slug
  })

  it('POST map region returns id', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Forest Region', geojson: '{}' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    regionId = data.id
  })

  it('GET regions returns the created region', async () => {
    const regions = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(Array.isArray(regions)).toBe(true)
    const found = regions.find((r: any) => r.id === regionId)
    expect(found).toBeDefined()
    expect(found.name).toBe('Forest Region')
  })

  it('PUT region updates name and returns success', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions/${regionId}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Updated Region' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify updated
    const regions = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions`, {
      headers: { 'X-API-Key': apiKey },
    })
    const found = regions.find((r: any) => r.id === regionId)
    expect(found?.name).toBe('Updated Region')
  })

  it('DELETE region returns 200 and region is gone', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions/${regionId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify gone
    const regions = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions`, {
      headers: { 'X-API-Key': apiKey },
    })
    const found = regions.find((r: any) => r.id === regionId)
    expect(found).toBeUndefined()
  })

  it('DELETE non-existent region returns 404', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/maps/${mapSlug}/regions/00000000-0000-0000-0000-000000000000`,
      { method: 'DELETE', headers: { 'X-API-Key': apiKey } },
    )
    expect(res.status).toBe(404)
  })

  it('PUT region by player returns 403', async () => {
    const playerEmail = `map-region-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'region-player-put-key')
    const playerApiKey = playerKeyData.key

    // Create a fresh region for this test
    const region = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Protected Region', geojson: '{}' },
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

    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions/${region.id}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { name: 'Should Fail' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE region by player returns 403', async () => {
    const playerEmail = `map-region-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'region-player-del-key')
    const playerApiKey = playerKeyData.key

    const region = await apiOk(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Delete Protected Region', geojson: '{}' },
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

    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions/${region.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
