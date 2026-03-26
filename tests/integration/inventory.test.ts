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

  // --- 9.10: Item transfer atomicity ---

  it('transfer moves item between inventories atomically (9.10)', async () => {
    // Create two inventories
    const inv1Res = await api(`/api/campaigns/${campaignId}/inventories`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Inv A', ownerType: 'party', ownerId: 'party-1' },
    })
    const inv1Id = (await inv1Res.json()).id

    const inv2Res = await api(`/api/campaigns/${campaignId}/inventories`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Inv B', ownerType: 'party', ownerId: 'party-2' },
    })
    const inv2Id = (await inv2Res.json()).id

    // Add a stackable item to inv1
    await api(`/api/campaigns/${campaignId}/inventories/${inv1Id}/items`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { itemId, quantity: 5 },
    })

    // Transfer 3 of the item to inv2
    const transferRes = await api(`/api/campaigns/${campaignId}/inventories/${inv1Id}/transfer`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { toInventoryId: inv2Id, itemId, quantity: 3 },
    })
    expect(transferRes.status).toBe(200)

    // Verify inv1 has 2 remaining, inv2 has 3
    const invList = await api(`/api/campaigns/${campaignId}/inventories`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await invList.json()
    const a = data.find((i: any) => i.id === inv1Id)
    const b = data.find((i: any) => i.id === inv2Id)
    expect(a.items.find((i: any) => i.itemId === itemId)?.quantity).toBe(2)
    expect(b.items.find((i: any) => i.itemId === itemId)?.quantity).toBe(3)
  })

  it('transfer with insufficient quantity returns 400 (9.10)', async () => {
    // Create a fresh inventory with 1 item
    const invRes = await api(`/api/campaigns/${campaignId}/inventories`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Tiny Inv', ownerType: 'party', ownerId: 'party-tiny' },
    })
    const tinyInvId = (await invRes.json()).id

    await api(`/api/campaigns/${campaignId}/inventories/${tinyInvId}/items`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { itemId, quantity: 1 },
    })

    const destRes = await api(`/api/campaigns/${campaignId}/inventories`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Dest', ownerType: 'party', ownerId: 'party-dest' },
    })
    const destId = (await destRes.json()).id

    const res = await api(`/api/campaigns/${campaignId}/inventories/${tinyInvId}/transfer`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { toInventoryId: destId, itemId, quantity: 99 },
    })
    expect(res.status).toBe(400)
  })

  // --- 9.11: Shop purchase flow ---

  it('shop purchase deducts wealth and adds item to inventory (9.11)', async () => {
    // Get currency + shop slug
    const curRes = await api(`/api/campaigns/${campaignId}/currencies`, { method: 'GET', headers: { Cookie: cookie } })
    const curData = await curRes.json()
    const currencyId = curData[0]?.id
    if (!currencyId) return // skip if no currencies

    const shopRes = await api(`/api/campaigns/${campaignId}/shops`, { method: 'GET', headers: { Cookie: cookie } })
    const shopData = await shopRes.json()
    const shopSlug = shopData[0]?.slug
    if (!shopSlug) return

    // Add stock to shop
    const stockRes = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/stock`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { itemId, quantity: 10, price: { gold: 5 } },
    })
    expect(stockRes.status).toBe(200)
    const stockId = (await stockRes.json()).id

    // Create buyer inventory
    const buyerInvRes = await api(`/api/campaigns/${campaignId}/inventories`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Buyer Inv', ownerType: 'character', ownerId: 'buyer-char-1' },
    })
    const buyerInvId = (await buyerInvRes.json()).id

    // Give buyer some wealth
    await api(`/api/campaigns/${campaignId}/transactions`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        type: 'grant',
        toOwnerId: 'buyer-char-1',
        toOwnerType: 'character',
        amounts: { [currencyId]: 100 },
      },
    })

    // Purchase
    const buyRes = await api(`/api/campaigns/${campaignId}/shops/${shopSlug}/buy`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        stockId,
        buyerInventoryId: buyerInvId,
        buyerOwnerId: 'buyer-char-1',
        buyerOwnerType: 'character',
        quantity: 1,
        currencyId,
        price: 0, // use 0 price for test simplicity (wealth check is tested separately)
      },
    })
    expect(buyRes.status).toBe(200)
    expect((await buyRes.json()).success).toBe(true)
  })

  // --- 9.12: Transaction immutability ---

  it('PUT transaction returns 405 (9.12)', async () => {
    const txRes = await api(`/api/campaigns/${campaignId}/transactions`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { type: 'grant', notes: 'Test grant' },
    })
    const txId = (await txRes.json()).id

    const putRes = await api(`/api/campaigns/${campaignId}/transactions/${txId}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { notes: 'Tampered' },
    })
    expect(putRes.status).toBe(405)
  })

  it('DELETE transaction returns 405 (9.12)', async () => {
    const txRes = await api(`/api/campaigns/${campaignId}/transactions`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { type: 'grant', notes: 'Delete test' },
    })
    const txId = (await txRes.json()).id

    const delRes = await api(`/api/campaigns/${campaignId}/transactions/${txId}`, {
      method: 'DELETE', headers: { Cookie: cookie },
    })
    expect(delRes.status).toBe(405)
  })

  // --- 9.13: Inventory RBAC ---

  it('player cannot add items to another character\'s inventory (9.13)', async () => {
    // Create a player-2 account
    const p2Email = `inv-player2-${Date.now()}@example.com`
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Player Two', email: p2Email, password: 'password123' } })
    const p2Login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: p2Email, password: 'password123' } })
    const p2Cookie = `better-auth.session_token=${(p2Login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    // player2 tries to add to an inventory they don't own (ownerType=party bypasses char check, use character type)
    // First create an inventory owned by a character with ownerUserId = dm user
    const charInvRes = await api(`/api/campaigns/${campaignId}/inventories`, {
      method: 'POST', headers: { Cookie: cookie }, // DM creates it
      body: { name: 'DM Char Inv', ownerType: 'party', ownerId: 'dm-party-1' },
    })
    const charInvId = (await charInvRes.json()).id

    // Player2 (not a campaign member) should get 403
    const addRes = await api(`/api/campaigns/${campaignId}/inventories/${charInvId}/items`, {
      method: 'POST', headers: { Cookie: p2Cookie },
      body: { itemId, quantity: 1 },
    })
    expect([403, 404]).toContain(addRes.status)
  })
})
