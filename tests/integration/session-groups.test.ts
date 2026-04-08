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

function withCsrf(cookie: string, csrfToken: string): Record<string, string> {
  return { Cookie: `${cookie}; csrf_token=${csrfToken}`, 'X-CSRF-Token': csrfToken }
}

describe('Session Groups + Content (integration)', () => {
  const email = `sgtest-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let groupSlug = ''
  let sessionSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'SG Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''
    csrfToken = await getCsrfToken(cookie)
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: `SG Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id
  })

  it('POST /session-groups creates a group', async () => {
    const res = await api(`/api/campaigns/${campaignId}/session-groups`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'La Familia', description: 'The main group' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('La Familia')
    expect(data.slug).toBe('la-familia')
    groupSlug = data.slug
  })

  it('GET /session-groups returns all groups', async () => {
    const res = await api(`/api/campaigns/${campaignId}/session-groups`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const body = await res.json()
    const data = body.data ?? body
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(data[0].name).toBe('La Familia')
  })

  it('PUT /session-groups/:slug updates name', async () => {
    const res = await api(`/api/campaigns/${campaignId}/session-groups/${groupSlug}`, {
      method: 'PUT',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'La Familia Updated', description: 'Updated desc' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('La Familia Updated')
  })

  it('POST /sessions with groupSlug assigns group', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { title: 'Group Session', groupSlug },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.groupId).toBeTruthy()
    sessionSlug = data.slug
  })

  it('GET /sessions returns groupName on sessions', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const body = await res.json()
    const data = body.data ?? body
    const grouped = data.find((s: Record<string, unknown>) => s.slug === sessionSlug)
    expect(grouped?.groupName).toBeTruthy()
  })

  it('GET /sessions?groupSlug= filters by group', async () => {
    // Create a session without a group
    await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { title: 'Ungrouped Session' },
    })

    const res = await api(`/api/campaigns/${campaignId}/sessions?groupSlug=${groupSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const body = await res.json()
    const data = body.data ?? body
    expect(data.length).toBe(1)
    expect(data[0].slug).toBe(sessionSlug)
  })

  it('GET /sessions/:slug returns hasContent flags', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.hasContent).toBeDefined()
    expect(data.hasContent.manual_notes).toBe(false)
    expect(data.hasContent.ai_notes).toBe(false)
    expect(data.hasContent.summary).toBe(false)
  })

  it('PUT /sessions/:slug/content upserts content', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'PUT',
      headers: withCsrf(cookie, csrfToken),
      body: { type: 'manual_notes', content: 'These are manual notes.' },
    })
    expect(res.status).toBe(200)
  })

  it('GET /sessions/:slug/content returns upserted content', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.manual_notes?.content).toBe('These are manual notes.')
    expect(data.ai_notes).toBeNull()
    expect(data.summary).toBeNull()
  })

  it('PUT /sessions/:slug/content upserts (overwrites) on repeat call', async () => {
    await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'PUT',
      headers: withCsrf(cookie, csrfToken),
      body: { type: 'manual_notes', content: 'Updated notes.' },
    })
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.manual_notes?.content).toBe('Updated notes.')
  })

  it('GET /sessions/:slug returns hasContent.manual_notes=true after upsert', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.hasContent.manual_notes).toBe(true)
  })

  it('DELETE /session-groups/:slug sets sessions groupId to null', async () => {
    await api(`/api/campaigns/${campaignId}/session-groups/${groupSlug}`, {
      method: 'DELETE',
      headers: withCsrf(cookie, csrfToken),
    })

    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.groupId).toBeNull()
    expect(data.groupName).toBeNull()
  })
})
