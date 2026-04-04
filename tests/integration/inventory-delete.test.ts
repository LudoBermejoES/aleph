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

describe('Inventory Delete (integration)', () => {
  const ts = Date.now()
  const email = `inventory-del-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let itemId = ''
  let inventoryId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'inventory-key')
    apiKey = keyData.key

    const camp = await apiOk('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Inventory Delete Test ${ts}` },
    })
    campaignId = camp.id

    // Create item
    const item = await apiOk(`/api/campaigns/${campaignId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Sword' },
    })
    itemId = item.id

    // Create inventory
    const inventory = await apiOk(`/api/campaigns/${campaignId}/inventories`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { ownerType: 'campaign', ownerId: campaignId },
    })
    inventoryId = inventory.id
  })

  it('POST item returns id and name', async () => {
    expect(itemId).toBeTruthy()
  })

  it('POST inventory returns id', async () => {
    expect(inventoryId).toBeTruthy()
  })

  it('POST inventory item adds item to inventory', async () => {
    const res = await api(`/api/campaigns/${campaignId}/inventories/${inventoryId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { itemId, quantity: 1 },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
  })

  it('GET inventory list includes items array with the added item', async () => {
    const inventories = await apiOk(`/api/campaigns/${campaignId}/inventories`, {
      headers: { 'X-API-Key': apiKey },
    })
    const inv = inventories.find((i: any) => i.id === inventoryId)
    expect(inv).toBeDefined()
    expect(Array.isArray(inv.items)).toBe(true)
    expect(inv.items.length).toBeGreaterThan(0)
    expect(inv.items[0]).toHaveProperty('id')
  })

  it('DELETE inventory item returns 200 and item is gone', async () => {
    // Add a fresh item so we have a known invItemId
    const addRes = await apiOk(`/api/campaigns/${campaignId}/inventories/${inventoryId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { itemId, quantity: 1 },
    })
    // If item is stackable it may stack; either way get the ID from GET
    const inventories = await apiOk(`/api/campaigns/${campaignId}/inventories`, {
      headers: { 'X-API-Key': apiKey },
    })
    const inv = inventories.find((i: any) => i.id === inventoryId)
    const invItemId = inv.items[0].id

    const delRes = await api(
      `/api/campaigns/${campaignId}/inventories/${inventoryId}/items/${invItemId}`,
      { method: 'DELETE', headers: { 'X-API-Key': apiKey } },
    )
    expect(delRes.status).toBe(200)
    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    // Verify item is gone
    const afterInventories = await apiOk(`/api/campaigns/${campaignId}/inventories`, {
      headers: { 'X-API-Key': apiKey },
    })
    const afterInv = afterInventories.find((i: any) => i.id === inventoryId)
    const stillThere = afterInv.items.find((it: any) => it.id === invItemId)
    expect(stillThere).toBeUndefined()
  })

  it('DELETE inventory cascades and returns 200', async () => {
    // Create a fresh inventory with an item for cascade test
    const freshItem = await apiOk(`/api/campaigns/${campaignId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Cascade Item' },
    })
    const freshInv = await apiOk(`/api/campaigns/${campaignId}/inventories`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { ownerType: 'campaign', ownerId: campaignId },
    })
    await apiOk(`/api/campaigns/${campaignId}/inventories/${freshInv.id}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { itemId: freshItem.id, quantity: 2 },
    })

    // Delete inventory — cascade deletes items
    const delRes = await api(`/api/campaigns/${campaignId}/inventories/${freshInv.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)
    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    // Inventory should be gone from list
    const invs = await apiOk(`/api/campaigns/${campaignId}/inventories`, {
      headers: { 'X-API-Key': apiKey },
    })
    const found = invs.find((i: any) => i.id === freshInv.id)
    expect(found).toBeUndefined()
  })

  it('DELETE inventory item by player returns 403', async () => {
    const playerEmail = `inventory-player-item-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'inv-player-item-key')
    const playerApiKey = playerKeyData.key

    // Add an item to get a valid invItemId
    const addedItem = await apiOk(`/api/campaigns/${campaignId}/inventories/${inventoryId}/items`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { itemId, quantity: 1 },
    })
    const inventories = await apiOk(`/api/campaigns/${campaignId}/inventories`, {
      headers: { 'X-API-Key': apiKey },
    })
    const inv = inventories.find((i: any) => i.id === inventoryId)
    const invItemId = inv.items[0].id

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

    // Players cannot delete campaign-owned inventory items (only their own character's)
    const res = await api(
      `/api/campaigns/${campaignId}/inventories/${inventoryId}/items/${invItemId}`,
      { method: 'DELETE', headers: { 'X-API-Key': playerApiKey } },
    )
    // editor role required for non-character inventories; player gets 403
    expect(res.status).toBe(403)
  })

  it('DELETE inventory by player returns 403', async () => {
    const playerEmail = `inventory-player-inv-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'inv-player-inv-key')
    const playerApiKey = playerKeyData.key

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

    const res = await api(`/api/campaigns/${campaignId}/inventories/${inventoryId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    // co_dm required; player gets 403
    expect(res.status).toBe(403)
  })
})
