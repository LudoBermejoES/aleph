import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Character extended text fields (integration)', () => {
  const email = `char-ext-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let slug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Ext Tester', email, password: 'password123' },
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
      body: { name: `Ext Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    const charRes = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'Aria Voss', characterType: 'pc' },
    })
    slug = (await charRes.json()).slug
  })

  it('GET returns null narrative fields by default', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.backstory).toBeNull()
    expect(data.history).toBeNull()
    expect(data.currentStatus).toBeNull()
  })

  it('GET returns description as alias for content', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data).toHaveProperty('description')
    expect(data.description).toBe(data.content)
  })

  it('PUT sets backstory and GET returns it', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { backstory: 'Grew up in the mountains.' },
    })
    expect(res.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.backstory).toBe('Grew up in the mountains.')
  })

  it('PUT updates history without overwriting backstory', async () => {
    await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { backstory: 'Grew up in the mountains.', history: 'Session 1: arrived.' },
    })

    await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { history: 'Session 1: arrived.\nSession 2: fought the wolf.' },
    })

    const get = await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.history).toBe('Session 1: arrived.\nSession 2: fought the wolf.')
    expect(data.backstory).toBe('Grew up in the mountains.')
  })

  it('PUT with null clears a field', async () => {
    await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { currentStatus: 'Wounded.' },
    })

    await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { currentStatus: null },
    })

    const get = await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.currentStatus).toBeNull()
  })

  it('GET returns all four narrative fields with correct values', async () => {
    await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: {
        content: 'Tall, red hair.',
        backstory: 'Born in the north.',
        history: 'Session 1: met the party.',
        currentStatus: 'Healthy.',
      },
    })

    const get = await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.description).toBe('Tall, red hair.')
    expect(data.backstory).toBe('Born in the north.')
    expect(data.history).toBe('Session 1: met the party.')
    expect(data.currentStatus).toBe('Healthy.')
  })
})
