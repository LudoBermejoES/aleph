import { describe, it, expect, beforeAll } from 'vitest'
import { ofetch } from 'ofetch'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

function api(path: string, opts?: any) {
  return ofetch(`${BASE_URL}${path}`, {
    ...opts,
    ignoreResponseError: true,
    // Return full response to inspect status + headers
  })
}

async function apiRaw(path: string, opts?: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Origin': BASE_URL,
      ...opts?.headers,
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
  return res
}

describe('Auth API (integration)', () => {
  const testEmail = `inttest-${Date.now()}@example.com`
  const testPassword = 'testpassword123'
  let sessionCookie = ''

  it('registers a new user', async () => {
    const res = await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'IntTest User', email: testEmail, password: testPassword },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user?.email).toBe(testEmail)
    expect(data.token).toBeDefined()
  })

  it('logs in with valid credentials and returns session cookie', async () => {
    const res = await apiRaw('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: testEmail, password: testPassword },
    })
    expect(res.status).toBe(200)
    const cookies = res.headers.get('set-cookie') || ''
    expect(cookies).toContain('better-auth.session_token')
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
    expect(sessionCookie).not.toBe('')
  })

  it('rejects invalid credentials', async () => {
    const res = await apiRaw('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: testEmail, password: 'wrongpassword' },
    })
    // Better Auth returns 200 with error body or 401
    const data = await res.json()
    expect(data.user).toBeFalsy()
  })

  it('unauthenticated request to /api/campaigns returns 401', async () => {
    const res = await apiRaw('/api/campaigns', { method: 'GET' })
    expect(res.status).toBe(401)
  })

  it('authenticated request to /api/campaigns succeeds', async () => {
    const res = await apiRaw('/api/campaigns', {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('creates a campaign with auth', async () => {
    const res = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: sessionCookie },
      body: { name: `IntTest Campaign ${Date.now()}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeDefined()
    expect(data.slug).toBeDefined()
  })
})

describe('Campaign RBAC (integration)', () => {
  const dmEmail = `dm-${Date.now()}@example.com`
  const playerEmail = `player-${Date.now()}@example.com`
  let dmCookie = ''
  let playerCookie = ''
  let campaignId = ''

  beforeAll(async () => {
    // Register DM
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'DM', email: dmEmail, password: 'password123' },
    })
    const dmLogin = await apiRaw('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dmEmail, password: 'password123' },
    })
    const dmCookies = dmLogin.headers.get('set-cookie') || ''
    const dmMatch = dmCookies.match(/better-auth\.session_token=([^;]+)/)
    dmCookie = dmMatch ? `better-auth.session_token=${dmMatch[1]}` : ''

    // Create campaign as DM
    const campRes = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie },
      body: { name: `RBAC Test ${Date.now()}` },
    })
    const campData = await campRes.json()
    campaignId = campData.id

    // Register player
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Player', email: playerEmail, password: 'password123' },
    })
    const playerLogin = await apiRaw('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: playerEmail, password: 'password123' },
    })
    const playerCookies = playerLogin.headers.get('set-cookie') || ''
    const playerMatch = playerCookies.match(/better-auth\.session_token=([^;]+)/)
    playerCookie = playerMatch ? `better-auth.session_token=${playerMatch[1]}` : ''

    // Invite player and join
    const inviteRes = await apiRaw(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { Cookie: dmCookie },
      body: { role: 'player' },
    })
    const inviteData = await inviteRes.json()

    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: inviteData.token },
    })
  })

  it('player cannot delete campaign (403)', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(403)
  })

  it('DM can list members', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/members`, {
      method: 'GET',
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(2)
  })

  it('invitation flow assigns correct role', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/members`, {
      method: 'GET',
      headers: { Cookie: dmCookie },
    })
    const members = await res.json()
    const player = members.find((m: any) => m.email === playerEmail)
    expect(player).toBeDefined()
    expect(player.role).toBe('player')
  })
})
