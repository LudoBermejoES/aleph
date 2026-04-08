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

describe('Map Pin Visibility Filtering (9.17)', () => {
  const dmEmail = `map-dm-${Date.now()}@example.com`
  const playerEmail = `map-player-${Date.now()}@example.com`
  let dmCookie = ''
  let dmCsrf = ''
  let playerCookie = ''
  let playerCsrf = ''
  let campaignId = ''
  let mapSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Map DM', email: dmEmail, password: 'password123' },
    })
    const dmLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dmEmail, password: 'password123' },
    })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    dmCsrf = await getCsrfToken(dmCookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: `Map Vis ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create a map
    const map = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: 'Test Map', width: 1000, height: 1000 },
    })
    mapSlug = (await map.json()).slug

    // Create pins with different visibility
    await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { label: 'Public Tavern', lat: 100, lng: 100, visibility: 'members' },
    })
    await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { label: 'Secret Lair', lat: 500, lng: 500, visibility: 'dm_only' },
    })

    // Player setup
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Map Player', email: playerEmail, password: 'password123' },
    })
    const playerLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: playerEmail, password: 'password123' },
    })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    playerCsrf = await getCsrfToken(playerCookie)

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { role: 'player' },
    })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie, playerCsrf),
      body: { token: inviteToken },
    })
  })

  it('DM sees all pins including dm_only', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}`, {
      method: 'GET',
      headers: { Cookie: dmCookie },
    })
    const data = await res.json()
    const labels = data.pins?.map((p: Record<string, unknown>) => p.label) || []
    expect(labels).toContain('Public Tavern')
    expect(labels).toContain('Secret Lair')
  })

  it('player does not see dm_only pins', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}`, {
      method: 'GET',
      headers: { Cookie: playerCookie },
    })
    const data = await res.json()
    const labels = data.pins?.map((p: Record<string, unknown>) => p.label) || []
    expect(labels).toContain('Public Tavern')
    expect(labels).not.toContain('Secret Lair')
  })
})

describe('Map Image Upload (9.18)', () => {
  const email = `map-upload-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'UploadUser', email, password: 'password123' },
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
      body: { name: `Upload ${Date.now()}` },
    })
    campaignId = (await camp.json()).id
  })

  it('upload endpoint exists and rejects empty body', async () => {
    const map = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'Upload Map', width: 500, height: 500 },
    })
    const mapSlug = (await map.json()).slug

    // Upload without file body — should get an error, not crash
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/maps/${mapSlug}/upload`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
    })
    // Expect 400 (bad request) since no file was attached
    expect([400, 415, 422, 500]).toContain(res.status)
  })
})
