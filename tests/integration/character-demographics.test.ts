import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Character demographics API (integration)', () => {
  const email = `demo-test-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let characterSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Demo Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
    const campList = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
    const setCookie = campList.headers.get('set-cookie') || ''
    const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
    csrfToken = csrfMatch?.[1] || ''
    cookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `Demo Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'Agnus', characterType: 'npc' },
    })
    const charData = await char.json()
    characterSlug = charData.slug
  })

  it('PUT sets birthYear, deathYear, gender', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { birthYear: 1200, deathYear: 1260, gender: 'Female' },
    })
    expect(res.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.birthYear).toBe(1200)
    expect(data.deathYear).toBe(1260)
    expect(data.gender).toBe('female') // server lowercases
  })

  it('PUT with omitted keys preserves existing demographic state', async () => {
    // birthYear=1220 is < deathYear=1260, so no year-range conflict
    await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { birthYear: 1220 },
    })
    const get = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.birthYear).toBe(1220)
    expect(data.deathYear).toBe(1260) // preserved
  })

  it('PUT with explicit null clears the field', async () => {
    await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { birthYear: null },
    })
    const get = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.birthYear).toBeNull()
  })

  it('PUT returns 400 when deathYear < birthYear', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { birthYear: 1500, deathYear: 1400 },
    })
    expect(res.status).toBe(400)
  })

  it('PUT returns 401 for unauthenticated request', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'PUT',
      body: { birthYear: 1100 },
    })
    expect(res.status).toBe(401)
  })

  it('GET list includes birthYear, deathYear, gender fields', async () => {
    await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { birthYear: 1200, deathYear: 1260, gender: 'female' },
    })
    const res = await api(`/api/campaigns/${campaignId}/characters`, {
      headers: { Cookie: cookie },
    })
    const body = await res.json()
    const list = Array.isArray(body) ? body : body.data
    const char = list.find((c: { slug: string }) => c.slug === characterSlug)
    expect(char).toBeDefined()
    expect(char.birthYear).toBe(1200)
    expect(char.deathYear).toBe(1260)
    expect(char.gender).toBe('female')
  })
})
