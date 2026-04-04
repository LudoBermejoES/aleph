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

describe('Currency CRUD (integration)', () => {
  const ts = Date.now()
  const email = `currency-crud-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'currency-crud-key')
    apiKey = keyData.key

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Currency CRUD Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id
  })

  it('POST currency creates a currency and returns id and name', async () => {
    const res = await api(`/api/campaigns/${campaignId}/currencies`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Gold Piece', symbol: 'gp', valueInBase: 100 },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data.name).toBe('Gold Piece')
  })

  it('PUT currency updates symbol and GET list reflects the change', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/currencies`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Silver Piece', symbol: 'sp', valueInBase: 10 },
    })
    const currency = await createRes.json()
    const currencyId = currency.id

    const putRes = await api(`/api/campaigns/${campaignId}/currencies/${currencyId}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { symbol: 'SP' },
    })
    expect(putRes.status).toBe(200)
    const putData = await putRes.json()
    expect(putData.success).toBe(true)

    const listRes = await api(`/api/campaigns/${campaignId}/currencies`, {
      headers: { 'X-API-Key': apiKey },
    })
    const currencies = await listRes.json()
    const updated = currencies.find((c: any) => c.id === currencyId)
    expect(updated?.symbol).toBe('SP')
  })

  it('DELETE currency removes it from the list', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/currencies`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Copper Piece', symbol: 'cp', valueInBase: 1 },
    })
    const currency = await createRes.json()
    const currencyId = currency.id

    const delRes = await api(`/api/campaigns/${campaignId}/currencies/${currencyId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)
    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    const listRes = await api(`/api/campaigns/${campaignId}/currencies`, {
      headers: { 'X-API-Key': apiKey },
    })
    const currencies = await listRes.json()
    expect(currencies.find((c: any) => c.id === currencyId)).toBeUndefined()
  })

  it('DELETE non-existent currency returns 404', async () => {
    const res = await api(`/api/campaigns/${campaignId}/currencies/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(404)
  })

  it('PUT currency by player returns 403', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/currencies`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Restricted Coin', symbol: 'rc', valueInBase: 5 },
    })
    const currency = await createRes.json()
    const currencyId = currency.id

    const playerEmail = `currency-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'currency-player-put-key')
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

    const res = await api(`/api/campaigns/${campaignId}/currencies/${currencyId}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { symbol: 'FAIL' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE currency by player returns 403', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/currencies`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Delete Restricted Coin', symbol: 'dr', valueInBase: 2 },
    })
    const currency = await createRes.json()
    const currencyId = currency.id

    const playerEmail = `currency-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'currency-player-del-key')
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

    const res = await api(`/api/campaigns/${campaignId}/currencies/${currencyId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
