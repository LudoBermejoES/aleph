/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
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

describe('Session Attendance Bulk (integration)', () => {
  const dmEmail = `att-dm-${Date.now()}@example.com`
  const playerEmail = `att-pl-${Date.now()}@example.com`
  let dmApiKey = ''
  let playerApiKey = ''
  let playerCookie = ''
  let campaignId = ''
  let sessionSlug = ''
  let characterSlug = ''

  beforeAll(async () => {
    // DM setup
    const dmCookie = await signUpAndGetCookie(dmEmail, 'password123', 'AttDM')
    const dmKeyData = await createApiKey(dmCookie, 'att-dm-key')
    dmApiKey = dmKeyData.key

    // Player setup
    playerCookie = await signUpAndGetCookie(playerEmail, 'password123', 'AttPlayer')
    const playerKeyData = await createApiKey(playerCookie, 'att-player-key')
    playerApiKey = playerKeyData.key

    // Get player userId to assign as character owner
    const sessionRes = await apiRaw('/api/auth/get-session', { headers: { Cookie: playerCookie } })
    const sessionData = await sessionRes.json()
    const playerUserId = sessionData.user.id

    // Create campaign as DM
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: `Att Test ${Date.now()}` },
    })
    campaignId = camp.id

    // Invite player and have them join
    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { role: 'player' },
    })
    const csrfMatch = playerCookie.match(/csrf_token=([^;]+)/)
    const csrfToken = csrfMatch?.[1] || ''
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': csrfToken },
      body: { token: inviteRes.token },
    })

    // DM creates character owned by the player
    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'AttHero', characterType: 'pc', ownerUserId: playerUserId },
    })
    characterSlug = char.slug

    // Create a session
    const sess = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { title: 'Att Session', status: 'completed' },
    })
    sessionSlug = sess.slug
  })

  it('DM can mark attendees → returns 200 with updated count', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance/bulk`,
      {
        method: 'PUT',
        headers: { 'X-API-Key': dmApiKey },
        body: { attendees: [characterSlug] },
      },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(1)
    expect(data.unresolved).toEqual([])
  })

  it('player gets 403 when calling bulk endpoint', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance/bulk`,
      {
        method: 'PUT',
        headers: { 'X-API-Key': playerApiKey },
        body: { attendees: [characterSlug] },
      },
    )
    expect(res.status).toBe(403)
  })

  it('unknown character slug appears in unresolved, no error', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance/bulk`,
      {
        method: 'PUT',
        headers: { 'X-API-Key': dmApiKey },
        body: { attendees: ['ghost-character-xyz'] },
      },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(0)
    expect(data.unresolved).toContain('ghost-character-xyz')
  })

  it('calling endpoint twice is idempotent', async () => {
    const payload = { attendees: [characterSlug], attended: true }
    const headers = { 'X-API-Key': dmApiKey }
    const url = `/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance/bulk`

    await api(url, { method: 'PUT', headers, body: payload })
    const res = await apiRaw(url, { method: 'PUT', headers, body: payload })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.updated).toBe(1)
  })
})
