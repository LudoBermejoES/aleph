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

async function createApiKey(cookie: string, keyName = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await api('/api/apikeys', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: { name: keyName } })
  return res.json()
}

describe('Shop CRUD (integration)', () => {
  const ts = Date.now()
  const email = `shop-crud-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'shop-crud-key')
    apiKey = keyData.key

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Shop CRUD Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id
  })

  it('POST shop creates a shop and returns id, slug, name', async () => {
    const res = await api(`/api/campaigns/${campaignId}/shops`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Probe Shop', description: 'Just checking' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('slug')
    expect(data.name).toBe('Probe Shop')
  })

  it('PUT shop updates name and GET list reflects the change', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/shops`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Blacksmith', description: 'Weapons' },
    })
    const shop = await createRes.json()
    const slug = shop.slug

    const putRes = await api(`/api/campaigns/${campaignId}/shops/${slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Fancy Blacksmith' },
    })
    expect(putRes.status).toBe(200)
    const putData = await putRes.json()
    expect(putData.success).toBe(true)

    const listRes = await api(`/api/campaigns/${campaignId}/shops`, {
      headers: { 'X-API-Key': apiKey },
    })
    const shops = await listRes.json()
    const updated = shops.find((s: any) => s.id === shop.id)
    expect(updated?.name).toBe('Fancy Blacksmith')
  })

  it('POST inventory owned by shop succeeds', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/shops`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Inventory Shop', description: 'Has an inventory' },
    })
    const shop = await createRes.json()

    const invRes = await api(`/api/campaigns/${campaignId}/inventories`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { ownerType: 'shop', ownerId: shop.id, name: 'Shop Stock' },
    })
    expect(invRes.status).toBe(200)
    const inv = await invRes.json()
    expect(inv).toHaveProperty('id')
  })

  it('DELETE shop removes it from the list', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/shops`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Shop To Delete', description: 'Will be deleted' },
    })
    const shop = await createRes.json()
    const slug = shop.slug

    const delRes = await api(`/api/campaigns/${campaignId}/shops/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)
    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    const listRes = await api(`/api/campaigns/${campaignId}/shops`, {
      headers: { 'X-API-Key': apiKey },
    })
    const shops = await listRes.json()
    expect(shops.find((s: any) => s.id === shop.id)).toBeUndefined()
  })

  it('PUT shop by player returns 403', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/shops`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Restricted Shop', description: 'Protected' },
    })
    const shop = await createRes.json()
    const slug = shop.slug

    const playerEmail = `shop-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'shop-player-put-key')
    const playerApiKey = playerKeyData.key

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/shops/${slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { name: 'Should Fail' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE shop by player returns 403', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/shops`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Delete Restricted Shop', description: 'Protected' },
    })
    const shop = await createRes.json()
    const slug = shop.slug

    const playerEmail = `shop-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'shop-player-del-key')
    const playerApiKey = playerKeyData.key

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/shops/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
