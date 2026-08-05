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

describe('Sub-Campaigns + Session Content (integration)', () => {
  const email = `sgtest-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let defaultSlug = ''
  let subCampaignSlug = ''
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

  it('a new campaign already has exactly one default sub-campaign', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sub-campaigns`, {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBe(1)
    expect(data[0].isDefault).toBe(true)
    defaultSlug = data[0].slug
  })

  it('POST /sub-campaigns creates a non-default sub-campaign', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sub-campaigns`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'La Familia', description: 'The main sub-campaign' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('La Familia')
    expect(data.slug).toBe('la-familia')
    expect(data.isDefault).toBe(false)
    subCampaignSlug = data.slug
  })

  it('GET /sub-campaigns returns both the default and the new one', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sub-campaigns`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBe(2)
    expect(data.some((sc: Record<string, unknown>) => sc.name === 'La Familia')).toBe(true)
  })

  it('PUT /sub-campaigns/:slug updates name', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sub-campaigns/${subCampaignSlug}`, {
      method: 'PUT',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'La Familia Updated', description: 'Updated desc' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('La Familia Updated')
  })

  it('POST /sessions with subCampaignSlug assigns it', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { title: 'Sub-campaign Session', subCampaignSlug },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.subCampaignId).toBeTruthy()
    sessionSlug = data.slug
  })

  it('POST /sessions without subCampaignSlug falls back to the default', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { title: 'Unassigned Session' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.subCampaignId).toBeTruthy()
  })

  it('GET /sessions returns subCampaignName on sessions', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const body = await res.json()
    const data = body.data ?? body
    const assigned = data.find((s: Record<string, unknown>) => s.slug === sessionSlug)
    expect(assigned?.subCampaignName).toBeTruthy()
  })

  it('GET /sessions?subCampaignSlug= filters by sub-campaign', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/sessions?subCampaignSlug=${subCampaignSlug}`,
      { method: 'GET', headers: { Cookie: cookie } },
    )
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

  it('DELETE /sub-campaigns/:slug (default) is rejected with 422', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sub-campaigns/${defaultSlug}`, {
      method: 'DELETE',
      headers: withCsrf(cookie, csrfToken),
    })
    expect(res.status).toBe(422)
  })

  it('DELETE /sub-campaigns/:slug (non-default) reassigns sessions to the default', async () => {
    const del = await api(`/api/campaigns/${campaignId}/sub-campaigns/${subCampaignSlug}`, {
      method: 'DELETE',
      headers: withCsrf(cookie, csrfToken),
    })
    expect(del.status).toBe(200)

    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.subCampaignId).toBeTruthy()
    expect(data.subCampaignSlug).toBe(defaultSlug)
  })
})
