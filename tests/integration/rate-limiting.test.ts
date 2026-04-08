import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
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

describe('Rate Limiting (integration)', () => {
  const ts = Date.now()
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    apiKey = await signUpAndGetApiKey(`rate-limit-${ts}@example.com`)
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Rate Limit Test ${ts}` },
    })
    campaignId = (await camp.json()).id
  })

  it('allows requests within the general limit', async () => {
    // Just a few requests — should all succeed (200 for campaign, not 401/429)
    for (let i = 0; i < 5; i++) {
      const res = await api(`/api/campaigns/${campaignId}`, {
        headers: { 'X-API-Key': apiKey },
      })
      expect([200, 404]).toContain(res.status)
    }
  })

  it('returns 429 with Retry-After header when limit is exceeded', async () => {
    // Fire 101+ requests to exceed the general limit (100/60s)
    // Use a unique fake IP via X-Forwarded-For to isolate this test
    const fakeIp = `10.0.${(Date.now() >> 4) % 255}.${(Date.now() >> 2) % 255}`
    let got429 = false
    let retryAfter: string | null = null

    for (let i = 0; i < 310; i++) {
      const res = await api(`/api/campaigns/${campaignId}`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Forwarded-For': fakeIp,
        },
      })
      if (res.status === 429) {
        got429 = true
        retryAfter = res.headers.get('Retry-After')
        break
      }
    }

    expect(got429).toBe(true)
    expect(retryAfter).not.toBeNull()
    expect(Number(retryAfter)).toBeGreaterThan(0)
  }, 30_000)

  it('auth endpoints have a stricter limit (30/60s)', async () => {
    const fakeIp = `10.1.${(Date.now() >> 4) % 255}.${((Date.now() >> 2) % 254) + 1}`
    let got429 = false

    for (let i = 0; i < 35; i++) {
      const res = await api('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'X-Forwarded-For': fakeIp },
        body: { email: 'x@x.com', password: 'wrong' },
      })
      if (res.status === 429) {
        got429 = true
        break
      }
    }

    expect(got429).toBe(true)
  }, 15_000)
})
