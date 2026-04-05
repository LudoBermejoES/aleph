/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(path: string, opts?: any) {
  const res = await apiRaw(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  // Trigger CSRF token generation
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

describe('Calendar Delete (integration)', () => {
  const ts = Date.now()
  const email = `cal-del-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'cal-del-key')
    apiKey = keyData.key
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Calendar Delete Test ${ts}` },
    })
    campaignId = camp.id
  })

  it('POST calendar creates a calendar and returns id and name', async () => {
    const created = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Smoke Test Calendar', months: [], weekdays: [] },
    })
    expect(created).toHaveProperty('id')
    expect(created.name).toBe('Smoke Test Calendar')
  })

  it('POST calendar event creates an event and returns id', async () => {
    const calendar = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Event Smoke Calendar', months: [], weekdays: [] },
    })

    const event = await api(`/api/campaigns/${campaignId}/calendars/${calendar.id}/events`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Smoke Event', date: { year: 1, month: 1, day: 1 } },
    })
    expect(event).toHaveProperty('id')
  })

  it('DELETE calendar event returns 200 and event is gone', async () => {
    const calendar = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Event Delete Calendar', months: [], weekdays: [] },
    })
    const calendarId = calendar.id

    const created = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Festival', date: { year: 1, month: 1, day: 1 } },
    })
    const eventId = created.id

    const delRes = await apiRaw(
      `/api/campaigns/${campaignId}/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      },
    )
    expect(delRes.status).toBe(200)
    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    // Verify event is gone
    const events = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}/events`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(events.find((e: any) => e.id === eventId)).toBeUndefined()
  })

  it('DELETE non-existent calendar event returns 404', async () => {
    const calendar = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: '404 Event Calendar', months: [], weekdays: [] },
    })

    const res = await apiRaw(
      `/api/campaigns/${campaignId}/calendars/${calendar.id}/events/00000000-0000-0000-0000-000000000000`,
      { method: 'DELETE', headers: { 'X-API-Key': apiKey } },
    )
    expect(res.status).toBe(404)
  })

  it('DELETE calendar returns 200 and calendar is gone', async () => {
    const created = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Calendar To Delete', months: [], weekdays: [] },
    })
    const calendarId = created.id

    const delRes = await apiRaw(`/api/campaigns/${campaignId}/calendars/${calendarId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)
    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    // Verify calendar is gone
    const calendars = await api(`/api/campaigns/${campaignId}/calendars`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(calendars.find((c: any) => c.id === calendarId)).toBeUndefined()
  })

  it('DELETE non-existent calendar returns 404', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/calendars/00000000-0000-0000-0000-000000000000`,
      { method: 'DELETE', headers: { 'X-API-Key': apiKey } },
    )
    expect(res.status).toBe(404)
  })

  it('DELETE calendar event by player role returns 403', async () => {
    const playerEmail = `cal-del-player-evt-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'cal-player-evt-key')
    const playerApiKey = playerKeyData.key

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const calendar = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Event 403 Calendar', months: [], weekdays: [] },
    })
    const calendarId = calendar.id

    const event = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Protected Event', date: { year: 1, month: 1, day: 1 } },
    })

    const res = await apiRaw(
      `/api/campaigns/${campaignId}/calendars/${calendarId}/events/${event.id}`,
      {
        method: 'DELETE',
        headers: { 'X-API-Key': playerApiKey },
      },
    )
    expect(res.status).toBe(403)
  })

  it('DELETE calendar by player role returns 403', async () => {
    const playerEmail = `cal-del-player-cal-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'cal-player-cal-key')
    const playerApiKey = playerKeyData.key

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const calendar = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Calendar 403 Delete', months: [], weekdays: [] },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/calendars/${calendar.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
