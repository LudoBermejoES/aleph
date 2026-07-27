import { describe, it, expect, beforeAll } from 'vitest'
import { RATE_LIMITS } from '../../server/utils/rate-limit'

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
    // Fire one more than the general allowance.
    // Use a unique fake IP via X-Forwarded-For to isolate this test
    const fakeIp = `10.0.${(Date.now() >> 4) % 255}.${(Date.now() >> 2) % 255}`
    let got429 = false
    let retryAfter: string | null = null

    for (let i = 0; i < RATE_LIMITS.general.maxRequests + 10; i++) {
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

  // Regression: `GET .../entities/:slug/image` is also the image-SERVING URL.
  // While the limiter classified by path suffix, every rendered thumbnail spent
  // a slot from the upload (write) budget, so an upload POST 429'd permanently.
  it('image GETs do not exhaust the upload budget', async () => {
    const fakeIp = `10.2.${(Date.now() >> 4) % 255}.${((Date.now() >> 2) % 254) + 1}`
    const headers = { 'X-API-Key': apiKey, 'X-Forwarded-For': fakeIp }

    // Well past the upload allowance. A 404 (no such entity / no image) still
    // means the request cleared the rate limiter, which is what we assert on.
    for (let i = 0; i < 200; i++) {
      const res = await api(`/api/campaigns/${campaignId}/entities/no-such-entity-${i}/image`, {
        headers,
      })
      expect(res.status).not.toBe(429)
    }

    const upload = await api(`/api/campaigns/${campaignId}/entities/no-such-entity/image`, {
      method: 'POST',
      headers,
    })
    expect(upload.status).not.toBe(429)
  }, 60_000)

  // Ordering regression. While the limiter was `02.rate-limit.ts` it ran AFTER
  // `01.auth.ts`, which throws 401 for every unauthenticated `/api/*` request — so
  // unauthenticated traffic to any non-auth endpoint never reached the limiter and was
  // completely unmetered, while still paying a DB API-key lookup or a full better-auth
  // getSession() per request. This asserts the limiter now sees that traffic: with no
  // credentials at all, a flood must eventually 429 instead of 401ing forever.
  it('meters unauthenticated traffic to a non-auth endpoint', async () => {
    const fakeIp = `10.3.${(Date.now() >> 4) % 255}.${((Date.now() >> 2) % 254) + 1}`
    // The upload budget (120) rather than general (1000): same code path, an eighth of
    // the requests. No X-API-Key, no Cookie — nothing that could authenticate.
    const path = `/api/campaigns/${campaignId}/entities/no-such-entity/image`
    const statuses: number[] = []

    for (let i = 0; i < RATE_LIMITS.upload.maxRequests + 5; i++) {
      const res = await api(path, { method: 'POST', headers: { 'X-Forwarded-For': fakeIp } })
      statuses.push(res.status)
      if (res.status === 429) break
    }

    expect(
      statuses.at(-1),
      'unauthenticated requests were never counted — is the rate limit middleware ' +
        'sorting after the auth middleware again?',
    ).toBe(429)
    // Everything before the 429 was rejected as unauthenticated, never served: the
    // limiter counted requests it had no identity for, which is the whole point.
    expect(new Set(statuses.slice(0, -1))).toEqual(new Set([401]))
    // And an unauthenticated request under the ceiling still gets its 401, not a 429.
    expect(statuses[0]).toBe(401)
  }, 30_000)

  it('auth endpoints have a stricter limit than general', async () => {
    expect(RATE_LIMITS.auth.maxRequests).toBeLessThan(RATE_LIMITS.general.maxRequests)
    const fakeIp = `10.1.${(Date.now() >> 4) % 255}.${((Date.now() >> 2) % 254) + 1}`
    let got429 = false

    for (let i = 0; i < RATE_LIMITS.auth.maxRequests + 5; i++) {
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
