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
      Origin: BASE_URL,
      ...opts?.headers,
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
  return res
}

async function getCsrfToken(sessionCookie: string): Promise<string> {
  const res = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = res.headers.get('set-cookie') || ''
  const match = setCookie.match(/csrf_token=([^;]+)/)
  return match?.[1] || ''
}

describe('Auth API (integration)', () => {
  const testEmail = `inttest-${Date.now()}@example.com`
  const testPassword = 'testpassword123'
  let sessionCookie = ''
  let csrfToken = ''

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
    // Extract CSRF token from set-cookie
    const setCookie = res.headers.get('set-cookie') || ''
    const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
    csrfToken = csrfMatch?.[1] || ''
  })

  it('creates a campaign with auth', async () => {
    const cookieWithCsrf = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
    const res = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookieWithCsrf, 'X-CSRF-Token': csrfToken },
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
  let dmCsrfToken = ''
  let playerCookie = ''
  let playerCsrfToken = ''
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
    const dmSessionCookie = dmMatch ? `better-auth.session_token=${dmMatch[1]}` : ''

    // Get CSRF token for DM
    dmCsrfToken = await getCsrfToken(dmSessionCookie)
    dmCookie = dmCsrfToken ? `${dmSessionCookie}; csrf_token=${dmCsrfToken}` : dmSessionCookie

    // Create campaign as DM
    const campRes = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
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
    const playerSessionCookie = playerMatch ? `better-auth.session_token=${playerMatch[1]}` : ''

    // Get CSRF token for player
    playerCsrfToken = await getCsrfToken(playerSessionCookie)
    playerCookie = playerCsrfToken
      ? `${playerSessionCookie}; csrf_token=${playerCsrfToken}`
      : playerSessionCookie

    // Invite player and join
    const inviteRes = await apiRaw(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
      body: { role: 'player' },
    })
    const inviteData = await inviteRes.json()

    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': playerCsrfToken },
      body: { token: inviteData.token },
    })
  })

  it('player cannot delete campaign (403)', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': playerCsrfToken },
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
