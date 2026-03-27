/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Origin': BASE_URL,
      ...opts?.headers,
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
  return res
}

/** Sign up a new user and return a session cookie */
async function signUpAndGetCookie(email: string, password: string, name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name, email, password },
  })
  const res = await apiRaw('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password },
  })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  return match ? `better-auth.session_token=${match[1]}` : ''
}

/** Create an API key using a cookie session */
async function createApiKey(cookie: string, name = 'test-key') {
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: { name },
  })
  return res.json()
}

describe('API key endpoint (integration)', () => {
  const email = `apikey-${Date.now()}@example.com`
  const password = 'password123'
  let cookie = ''
  let createdKeyId = ''

  beforeAll(async () => {
    cookie = await signUpAndGetCookie(email, password)
  })

  it('POST /api/apikeys returns key with raw value', async () => {
    const data = await createApiKey(cookie, 'my-cli-key')
    expect(data.id).toBeDefined()
    expect(data.key).toMatch(/^aleph_[0-9a-f]{64}$/)
    expect(data.keyPrefix).toBe(data.key.slice(0, 14))
    createdKeyId = data.id
  })

  it('GET /api/apikeys lists keys without raw value', async () => {
    const res = await apiRaw('/api/apikeys', {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const keys = await res.json()
    const found = keys.find((k: any) => k.id === createdKeyId)
    expect(found).toBeDefined()
    expect(found.key).toBeUndefined() // raw key not returned in list
    expect(found.keyPrefix).toBeDefined()
  })

  it('POST /api/apikeys rejects missing name with 400', async () => {
    const res = await apiRaw('/api/apikeys', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: {},
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/apikeys rejects unauthenticated with 401', async () => {
    const res = await apiRaw('/api/apikeys', {
      method: 'POST',
      body: { name: 'no-auth' },
    })
    expect(res.status).toBe(401)
  })
})

describe('API key authentication (integration)', () => {
  const email = `xapikey-${Date.now()}@example.com`
  const password = 'password123'
  let cookie = ''
  let apiKeyRaw = ''

  beforeAll(async () => {
    cookie = await signUpAndGetCookie(email, password)
    const data = await createApiKey(cookie, 'auth-test-key')
    apiKeyRaw = data.key
  })

  it('X-API-Key header authenticates against /api/campaigns', async () => {
    const res = await apiRaw('/api/campaigns', {
      method: 'GET',
      headers: { 'X-API-Key': apiKeyRaw },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('invalid X-API-Key returns 401', async () => {
    const res = await apiRaw('/api/campaigns', {
      method: 'GET',
      headers: { 'X-API-Key': 'aleph_invalid_key_value_0000000000000000000000000000000000000000' },
    })
    expect(res.status).toBe(401)
  })
})

describe('API key revocation (integration)', () => {
  const email = `revoke-${Date.now()}@example.com`
  const password = 'password123'
  let cookie = ''

  beforeAll(async () => {
    cookie = await signUpAndGetCookie(email, password)
  })

  it('create → use → revoke → verify 401', async () => {
    const data = await createApiKey(cookie, 'revocation-key')
    const { key: apiKey, id } = data

    // Key works before revocation
    const before = await apiRaw('/api/campaigns', {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    })
    expect(before.status).toBe(200)

    // Revoke
    const revRes = await apiRaw(`/api/apikeys/${id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    expect(revRes.status).toBe(200)

    // Key no longer works
    const after = await apiRaw('/api/campaigns', {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    })
    expect(after.status).toBe(401)
  })

  it('cannot revoke another user\'s key (returns 404)', async () => {
    // Create a second user with their own key
    const otherEmail = `other-revoke-${Date.now()}@example.com`
    const otherCookie = await signUpAndGetCookie(otherEmail, 'password123')
    const data = await createApiKey(otherCookie, 'other-key')

    // Try to revoke other user's key as first user
    const res = await apiRaw(`/api/apikeys/${data.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(404)
  })
})

describe('API key isolation (integration)', () => {
  it('GET /api/apikeys returns only current user\'s keys', async () => {
    const emailA = `iso-a-${Date.now()}@example.com`
    const emailB = `iso-b-${Date.now()}@example.com`
    const cookieA = await signUpAndGetCookie(emailA, 'password123')
    const cookieB = await signUpAndGetCookie(emailB, 'password123')

    const keyA = await createApiKey(cookieA, 'key-a')
    const keyB = await createApiKey(cookieB, 'key-b')

    const resA = await apiRaw('/api/apikeys', { method: 'GET', headers: { Cookie: cookieA } })
    const keysA = await resA.json()
    const resB = await apiRaw('/api/apikeys', { method: 'GET', headers: { Cookie: cookieB } })
    const keysB = await resB.json()

    expect(keysA.find((k: any) => k.id === keyA.id)).toBeDefined()
    expect(keysA.find((k: any) => k.id === keyB.id)).toBeUndefined()
    expect(keysB.find((k: any) => k.id === keyB.id)).toBeDefined()
    expect(keysB.find((k: any) => k.id === keyA.id)).toBeUndefined()
  })
})

describe('Old CLI token endpoint removed (integration)', () => {
  it('POST /api/cli/token is no longer accessible (401 or 404)', async () => {
    const res = await apiRaw('/api/cli/token', {
      method: 'POST',
      body: { email: 'x@test.com', password: 'test' },
    })
    // Auth middleware intercepts before Nitro can 404, so either is acceptable
    expect([401, 404]).toContain(res.status)
  })
})

describe('CLI campaign workflow via API key (integration)', () => {
  const email = `cli-camp-${Date.now()}@example.com`
  const password = 'password123'
  let apiKeyRaw = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const data = await createApiKey(cookie, 'cli-workflow-key')
    apiKeyRaw = data.key
  })

  it('campaign create via X-API-Key', async () => {
    const res = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKeyRaw },
      body: { name: `CLI Test Campaign ${Date.now()}`, theme: 'cyberpunk' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeDefined()
    campaignId = data.id
  })

  it('entity CRUD via X-API-Key', async () => {
    // Create
    const createRes = await apiRaw(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKeyRaw },
      body: { name: 'Test NPC', type: 'npc', content: 'A mysterious figure.' },
    })
    expect(createRes.status).toBe(200)
    const entity = await createRes.json()
    const slug = entity.slug

    // Read
    const getRes = await apiRaw(`/api/campaigns/${campaignId}/entities/${slug}`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKeyRaw },
    })
    expect(getRes.status).toBe(200)
    const got = await getRes.json()
    expect(got.name).toBe('Test NPC')

    // Update
    const putRes = await apiRaw(`/api/campaigns/${campaignId}/entities/${slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKeyRaw },
      body: { content: 'Updated.' },
    })
    expect(putRes.status).toBe(200)

    // Delete
    const delRes = await apiRaw(`/api/campaigns/${campaignId}/entities/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKeyRaw },
    })
    expect(delRes.status).toBe(200)
  })

  it('roll endpoint via X-API-Key', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/roll`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKeyRaw },
      body: { formula: '2d6+3' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.formula).toBe('2d6+3')
    expect(data.total).toBeGreaterThanOrEqual(5)
    expect(data.total).toBeLessThanOrEqual(15)
  })
})
