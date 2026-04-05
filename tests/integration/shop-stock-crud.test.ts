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

async function createApiKey(cookie: string, keyName = 'test-key') {
  const res = await api('/api/apikeys', { method: 'POST', headers: { Cookie: cookie }, body: { name: keyName } })
  return res.json()
}

describe('Shop Stock CRUD (integration)', () => {
  const ts = Date.now()
  const email = `stock-crud-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let shopSlug = ''
  let itemId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'stock-crud-key')
    apiKey = keyData.key

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Stock CRUD Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id

    const shopRes = await api(`/api/campaigns/${campaignId}/shops`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Test Stock Shop' },
    })
    const shop = await shopRes.json()
    shopSlug = shop.slug

    const itemRes = await api(`/api/campaigns/${campaignId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Test Sword', rarity: 'common' },
    })
    const item = await itemRes.json()
    itemId = item.id
  })

  it('POST stock adds an item to shop stock', async () => {
    const res = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { itemId, quantity: 5 },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
  })

  it('PUT stock updates quantity and availability', async () => {
    const addRes = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { itemId, quantity: 10 },
    })
    const stock = await addRes.json()
    const stockId = stock.id

    const updateRes = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock/${stockId}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { quantity: 3, isAvailable: false },
    })
    expect(updateRes.status).toBe(200)
    const updated = await updateRes.json()
    expect(updated.quantity).toBe(3)
    expect(updated.isAvailable).toBe(false)
  })

  it('PUT stock returns 404 for missing stock entry', async () => {
    const res = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock/nonexistent-id`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { quantity: 1 },
    })
    expect(res.status).toBe(404)
  })

  it('DELETE stock removes the stock entry', async () => {
    const addRes = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { itemId, quantity: 2 },
    })
    const stock = await addRes.json()
    const stockId = stock.id

    const delRes = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock/${stockId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(204)

    // Verify removed by checking shop stock
    const shopRes = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    const shopData = await shopRes.json()
    const found = shopData.stock?.find((s: any) => s.id === stockId)
    expect(found).toBeUndefined()
  })

  it('DELETE stock returns 404 for missing stock entry', async () => {
    const res = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock/nonexistent-id`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(404)
  })

  it('PUT stock by player returns 403', async () => {
    const addRes = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { itemId, quantity: 1 },
    })
    const stock = await addRes.json()
    const stockId = stock.id

    const playerEmail = `stock-player-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'stock-player-key')
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

    const res = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock/${stockId}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { quantity: 99 },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE stock by player returns 403', async () => {
    const addRes = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { itemId, quantity: 1 },
    })
    const stock = await addRes.json()
    const stockId = stock.id

    const playerEmail = `stock-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'stock-player-del-key')
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

    const res = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock/${stockId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
