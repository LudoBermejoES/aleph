import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  // Trigger CSRF token generation
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, keyName = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await api('/api/apikeys', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: { name: keyName } })
  return res.json()
}

describe('Timeline CRUD (integration)', () => {
  const ts = Date.now()
  const email = `timeline-crud-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'timeline-crud-key')
    apiKey = keyData.key

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Timeline CRUD Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id
  })

  it('POST timeline creates a timeline and returns id and slug', async () => {
    const res = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Probe Timeline', description: 'Just checking' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('slug')
  })

  it('PUT timeline updates name and GET reflects the change', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Main Timeline', description: 'The story' },
    })
    const { slug } = await createRes.json()

    const putRes = await api(`/api/campaigns/${campaignId}/timelines/${slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Updated Timeline' },
    })
    expect(putRes.status).toBe(200)
    const putData = await putRes.json()
    expect(putData.success).toBe(true)

    const getRes = await api(`/api/campaigns/${campaignId}/timelines/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(getRes.status).toBe(200)
    const tlData = await getRes.json()
    expect(tlData.name).toBe('Updated Timeline')
  })

  it('POST event creates an event and returns id', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Event Timeline', description: 'For event tests' },
    })
    const { slug } = await createRes.json()

    const eventRes = await api(`/api/campaigns/${campaignId}/timelines/${slug}/events`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        name: 'Battle of Phandalin',
        date: { year: 1, month: 3, day: 15 },
        description: 'A pivotal battle',
      },
    })
    expect(eventRes.status).toBe(200)
    const eventData = await eventRes.json()
    expect(eventData).toHaveProperty('id')
  })

  it('DELETE event removes it from the timeline', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Delete Event Timeline', description: 'For delete event test' },
    })
    const { slug } = await createRes.json()

    const eventRes = await api(`/api/campaigns/${campaignId}/timelines/${slug}/events`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Ephemeral Event', date: { year: 2, month: 1, day: 5 } },
    })
    const { id: eventId } = await eventRes.json()

    const delRes = await api(`/api/campaigns/${campaignId}/timelines/${slug}/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)
    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    // Verify event is gone
    const getRes = await api(`/api/campaigns/${campaignId}/timelines/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    const tlData = await getRes.json()
    expect(tlData.events.find((e: any) => e.id === eventId)).toBeUndefined()
  })

  it('DELETE timeline removes it', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Timeline To Delete', description: 'Will be deleted' },
    })
    const { slug } = await createRes.json()

    const delRes = await api(`/api/campaigns/${campaignId}/timelines/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)
    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    // Verify it's gone
    const getRes = await api(`/api/campaigns/${campaignId}/timelines/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(getRes.status).toBe(404)
  })

  it('PUT timeline by player returns 403', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Restricted Timeline', description: 'Protected' },
    })
    const { slug } = await createRes.json()

    const playerEmail = `timeline-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'timeline-player-put-key')
    const playerApiKey = playerKeyData.key

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/timelines/${slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { name: 'Should Fail' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE timeline by player returns 403', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Delete Restricted', description: 'Protected' },
    })
    const { slug } = await createRes.json()

    const playerEmail = `timeline-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'timeline-player-del-key')
    const playerApiKey = playerKeyData.key

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/timelines/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE timeline event by player returns 403', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Event Delete Restricted', description: 'Protected' },
    })
    const { slug } = await createRes.json()

    const eventRes = await api(`/api/campaigns/${campaignId}/timelines/${slug}/events`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Protected Event', date: { year: 3, month: 6, day: 1 } },
    })
    const { id: eventId } = await eventRes.json()

    const playerEmail = `timeline-player-evdel-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'timeline-player-evdel-key')
    const playerApiKey = playerKeyData.key

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/timelines/${slug}/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
