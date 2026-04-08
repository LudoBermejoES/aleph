/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
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
  // Trigger CSRF token generation
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

describe('Item CRUD (integration)', () => {
  const ts = Date.now()
  const email = `item-crud-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'item-crud-key')
    apiKey = keyData.key
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Item CRUD Test ${ts}` },
    })
    campaignId = camp.id
  })

  it('POST item creates an item and returns id and name', async () => {
    const created = await api(`/api/campaigns/${campaignId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Iron Sword', rarity: 'common' },
    })
    expect(created).toHaveProperty('id')
    expect(created.name).toBe('Iron Sword')
  })

  it('PUT item updates name and rarity', async () => {
    const created = await api(`/api/campaigns/${campaignId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Old Sword', rarity: 'common' },
    })
    const itemId = created.id

    const putRes = await apiRaw(`/api/campaigns/${campaignId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Updated Sword', rarity: 'rare' },
    })
    expect(putRes.status).toBe(200)
    const putData = await putRes.json()
    expect(putData.success).toBe(true)

    // Verify via list
    const items = await api(`/api/campaigns/${campaignId}/items`, {
      headers: { 'X-API-Key': apiKey },
    })
    const updated = items.find((i: Record<string, unknown>) => i.id === itemId)
    expect(updated).toBeDefined()
    expect(updated.name).toBe('Updated Sword')
    expect(updated.rarity).toBe('rare')
  })

  it('DELETE item returns 200 and item is gone', async () => {
    const created = await api(`/api/campaigns/${campaignId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Item To Delete', rarity: 'uncommon' },
    })
    const itemId = created.id

    const delRes = await apiRaw(`/api/campaigns/${campaignId}/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)
    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    // Verify it's gone
    const items = await api(`/api/campaigns/${campaignId}/items`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(items.find((i: Record<string, unknown>) => i.id === itemId)).toBeUndefined()
  })

  it('DELETE non-existent item returns 404', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/items/00000000-0000-0000-0000-000000000000`,
      {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      },
    )
    expect(res.status).toBe(404)
  })

  it('PUT item by player role returns 403', async () => {
    const playerEmail = `item-crud-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'item-player-put-key')
    const playerApiKey = playerKeyData.key

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const created = await api(`/api/campaigns/${campaignId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Role Test Item', rarity: 'common' },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/items/${created.id}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { name: 'Should Fail' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE item by player role returns 403', async () => {
    const playerEmail = `item-crud-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'item-player-del-key')
    const playerApiKey = playerKeyData.key

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const created = await api(`/api/campaigns/${campaignId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Protected Item', rarity: 'common' },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/items/${created.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
