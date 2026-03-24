import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Inventory & Economy (integration)', () => {
  const email = `inv-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let itemId = ''
  let shopId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Inv Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Inv Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('POST item creates with rarity', async () => {
    const res = await api(`/api/campaigns/${campaignId}/items`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Sunblade', rarity: 'legendary', description: 'A radiant weapon', price: { gold: 5000 } },
    })
    expect(res.status).toBe(200)
    itemId = (await res.json()).id
  })

  it('GET items list filters by rarity', async () => {
    // Add a common item
    await api(`/api/campaigns/${campaignId}/items`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Rope', rarity: 'common' },
    })

    const res = await api(`/api/campaigns/${campaignId}/items?rarity=legendary`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.every((i: any) => i.rarity === 'legendary')).toBe(true)
  })

  it('POST currency creates with conversion rate', async () => {
    const res = await api(`/api/campaigns/${campaignId}/currencies`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Gold', symbol: 'gp', valueInBase: 100, sortOrder: 0 },
    })
    expect(res.status).toBe(200)
  })

  it('GET currencies returns list', async () => {
    await api(`/api/campaigns/${campaignId}/currencies`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Silver', symbol: 'sp', valueInBase: 10, sortOrder: 1 },
    })

    const res = await api(`/api/campaigns/${campaignId}/currencies`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(2)
    expect(data[0].name).toBe('Gold') // sorted by sortOrder
  })

  it('POST shop creates', async () => {
    const res = await api(`/api/campaigns/${campaignId}/shops`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Ye Olde Shoppe', description: 'General store' },
    })
    expect(res.status).toBe(200)
    shopId = (await res.json()).id
  })

  it('GET shops list returns created shop', async () => {
    const res = await api(`/api/campaigns/${campaignId}/shops`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.find((s: any) => s.id === shopId)).toBeDefined()
  })

  it('POST transaction logs trade', async () => {
    const res = await api(`/api/campaigns/${campaignId}/transactions`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { type: 'loot', toEntityId: 'player-1', itemId, quantity: 1, notes: 'Found in dungeon' },
    })
    expect(res.status).toBe(200)
  })

  it('GET transactions returns log', async () => {
    const res = await api(`/api/campaigns/${campaignId}/transactions`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(data[0].type).toBe('loot')
  })
})
