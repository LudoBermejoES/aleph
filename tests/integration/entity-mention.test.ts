import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function getCsrfToken(sessionCookie: string): Promise<string> {
  const res = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = res.headers.get('set-cookie') || ''
  const match = setCookie.match(/csrf_token=([^;]+)/)
  return match?.[1] || ''
}

function withCsrf(cookie: string, csrfToken: string) {
  return { Cookie: `${cookie}; csrf_token=${csrfToken}`, 'X-CSRF-Token': csrfToken }
}

describe('Entity search for @mention autocomplete', () => {
  const email = `mention-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'MentionUser', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    csrfToken = await getCsrfToken(cookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: `Mention ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create entities to search
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'Strahd von Zarovich', type: 'character', content: '# Strahd' },
    })
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'Barovia', type: 'location', content: '# Barovia' },
    })
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'Castle Ravenloft', type: 'location', content: '# Castle' },
    })
  })

  it('search returns matching entities for autocomplete', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities?search=Strahd&limit=8`, {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    const names = (data.entities || []).map((e: Record<string, unknown>) => e.name)
    expect(names).toContain('Strahd von Zarovich')
    expect(names).not.toContain('Barovia')
  })

  it('search returns multiple matches for partial query', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities?search=a&limit=8`, {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    // All 3 entities contain 'a'
    expect((data.entities || []).length).toBeGreaterThanOrEqual(2)
  })

  it('search returns empty for no match', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities?search=zzzznotfound&limit=8`, {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect((data.entities || []).length).toBe(0)
  })

  it('search respects limit parameter', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities?search=a&limit=1`, {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect((data.entities || []).length).toBeLessThanOrEqual(1)
  })
})
