import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Session CRUD (integration)', () => {
  const email = `sess-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let sessionSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Session Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Sess Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('POST creates session with auto-increment number', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { title: 'The Beginning' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sessionNumber).toBe(1)
    expect(data.status).toBe('planned')
    sessionSlug = data.slug
  })

  it('second session gets number 2', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { title: 'Into the Dark' },
    })
    const data = await res.json()
    expect(data.sessionNumber).toBe(2)
  })

  it('GET session detail includes attendance and log', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe('The Beginning')
    expect(data.attendance).toBeDefined()
    expect(data.logContent).toBeDefined()
  })

  it('PUT updates session status', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { status: 'active' },
    })
    expect(res.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.status).toBe('active')
  })

  it('PATCH attendance sets RSVP', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance`, {
      method: 'PATCH', headers: { Cookie: cookie },
      body: { rsvpStatus: 'accepted' },
    })
    expect(res.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.attendance.length).toBeGreaterThanOrEqual(1)
    expect(data.attendance[0].rsvpStatus).toBe('accepted')
  })

  it('GET session list returns sessions', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Quest CRUD (integration)', () => {
  const email = `quest-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let questSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Quest Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Quest Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('POST creates quest', async () => {
    const res = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Find the Lost Sword', description: 'A legendary weapon lies hidden' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Find the Lost Sword')
    expect(data.status).toBe('active')
    questSlug = data.slug
  })

  it('POST creates sub-quest with parent', async () => {
    const parent = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const quests = await parent.json()
    const parentId = quests[0].id

    const res = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Visit the Smith', parentQuestId: parentId },
    })
    expect(res.status).toBe(200)
  })

  it('PUT updates quest status with valid transition', async () => {
    const res = await api(`/api/campaigns/${campaignId}/quests/${questSlug}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { status: 'completed' },
    })
    expect(res.status).toBe(200)
  })

  it('PUT rejects invalid status transition', async () => {
    // completed → active is not allowed
    const res = await api(`/api/campaigns/${campaignId}/quests/${questSlug}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { status: 'active' },
    })
    expect(res.status).toBe(400)
  })

  it('GET quest list returns quests', async () => {
    const res = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(2)
  })
})
