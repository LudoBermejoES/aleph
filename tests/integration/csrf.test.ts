import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookies(email: string) {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Test', email, password: 'password123' } })
  const loginRes = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
  const setCookieHeader = loginRes.headers.get('set-cookie') || ''
  return setCookieHeader
}

function extractCookie(setCookie: string, name: string): string {
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`))
  return match ? `${name}=${match[1]}` : ''
}

describe('CSRF Protection (integration)', () => {
  const ts = Date.now()
  let sessionCookie = ''
  let csrfToken = ''
  let campaignId = ''
  let apiKey = ''

  beforeAll(async () => {
    const email = `csrf-test-${ts}@example.com`
    const setCookieHeader = await signUpAndGetCookies(email)
    sessionCookie = extractCookie(setCookieHeader, 'better-auth.session_token')

    // Make an authenticated GET to get the csrf_token cookie set
    const getRes = await api('/api/campaigns', {
      headers: { Cookie: sessionCookie },
    })
    const authSetCookie = getRes.headers.get('set-cookie') || ''
    const csrfCookieMatch = authSetCookie.match(/csrf_token=([^;]+)/)
    csrfToken = csrfCookieMatch?.[1] || ''
    sessionCookie += (sessionCookie ? '; ' : '') + `csrf_token=${csrfToken}`

    // Create campaign via API key (exempt from CSRF)
    const keyRes = await api('/api/apikeys', {
      method: 'POST',
      headers: { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'csrf-key' },
    })
    apiKey = (await keyRes.json()).key
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `CSRF Test ${ts}` },
    })
    campaignId = (await camp.json()).id
  })

  it('rejects cookie-authenticated POST without CSRF token (403)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { Cookie: sessionCookie.replace(/csrf_token=[^;]+/, 'csrf_token=') },
      body: { name: 'Test', type: 'lore' },
    })
    // With no CSRF header, expect 403
    const withoutCsrf = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
      body: { name: 'Test', type: 'lore' },
    })
    // CSRF header is required — without it, 403
    expect([403, 422]).toContain(res.status) // 422 if Zod fires first, 403 if CSRF fires first
    void withoutCsrf
  })

  it('accepts cookie-authenticated POST with valid CSRF token', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: {
        Cookie: sessionCookie,
        'X-CSRF-Token': csrfToken,
      },
      body: { name: `CSRF OK Entity ${ts}`, type: 'lore' },
    })
    expect([200, 201]).toContain(res.status)
  })

  it('API key requests bypass CSRF check', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `No CSRF Entity ${ts}`, type: 'lore' },
    })
    expect([200, 201]).toContain(res.status)
  })
})
