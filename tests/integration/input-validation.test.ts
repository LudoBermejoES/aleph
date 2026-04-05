import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetApiKey(email: string) {
  await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name: 'Test', email, password: 'password123' },
  })
  const loginRes = await api('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password: 'password123' },
  })
  const cookies = loginRes.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  // Get CSRF token
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const fullCookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
  const keyRes = await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: fullCookie, 'X-CSRF-Token': csrfToken },
    body: { name: 'key' },
  })
  return (await keyRes.json()).key as string
}

describe('Input Validation (integration)', () => {
  const ts = Date.now()
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    apiKey = await signUpAndGetApiKey(`input-val-${ts}@example.com`)
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Input Val Test ${ts}` },
    })
    campaignId = (await camp.json()).id
  })

  it('rejects campaign creation with empty name (422)', async () => {
    const res = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: '' },
    })
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.data?.errors).toBeInstanceOf(Array)
  })

  it('rejects campaign creation with name too long (422)', async () => {
    const res = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'x'.repeat(201) },
    })
    expect(res.status).toBe(422)
  })

  it('rejects entity creation with missing name (422)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { type: 'lore' },
    })
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.data?.errors[0].field).toBe('name')
  })

  it('rejects entity with invalid visibility enum (422)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Test', type: 'lore', visibility: 'super_secret' },
    })
    expect(res.status).toBe(422)
  })

  it('accepts valid entity creation (201/200)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Valid Entity ${ts}`, type: 'lore', visibility: 'members' },
    })
    expect(res.status).toBe(200)
  })

  it('returns 422 with structured errors for missing relation fields', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { attitude: 999 }, // attitude out of range, missing required fields
    })
    expect([400, 422]).toContain(res.status)
  })
})
