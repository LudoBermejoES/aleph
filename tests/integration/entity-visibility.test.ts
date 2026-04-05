import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
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

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

describe('Entity Visibility (integration)', () => {
  const ts = Date.now()
  const dmEmail = `vis-dm-${ts}@example.com`
  const playerEmail = `vis-player-${ts}@example.com`
  let dmApiKey = ''
  let playerCookie = ''
  let campaignId = ''
  let publicEntitySlug = ''
  let dmOnlyEntitySlug = ''
  let privateEntitySlug = ''

  beforeAll(async () => {
    // DM setup
    const dmCookie = await signUpAndGetCookie(dmEmail, 'password123', 'DM User')
    const keyData = await createApiKey(dmCookie, 'dm-key')
    dmApiKey = keyData.key

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: `Vis Test ${ts}` },
    })
    const campData = await camp.json()
    campaignId = campData.id

    // Register player and join campaign via invite
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Player User', email: playerEmail, password: 'password123' },
    })
    playerCookie = await signUpAndGetCookie(playerEmail)

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { role: 'player' },
    })
    const { token } = await invite.json()
    const playerCsrf = playerCookie.match(/csrf_token=([^;]+)/)?.[1] || ''
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': playerCsrf },
      body: { token },
    })

    // Create entities with different visibility levels
    const pub = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: `Public Entity ${ts}`, type: 'lore', visibility: 'public' },
    })
    publicEntitySlug = (await pub.json()).slug

    const dmOnly = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: `DM Only Entity ${ts}`, type: 'lore', visibility: 'dm_only' },
    })
    dmOnlyEntitySlug = (await dmOnly.json()).slug

    const priv = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: `Private Entity ${ts}`, type: 'lore', visibility: 'private' },
    })
    privateEntitySlug = (await priv.json()).slug
  })

  it('DM can view public entity', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${publicEntitySlug}`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(200)
  })

  it('DM can view dm_only entity', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${dmOnlyEntitySlug}`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(200)
  })

  it('player can view public entity', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${publicEntitySlug}`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(200)
  })

  it('player cannot view dm_only entity (gets 404)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${dmOnlyEntitySlug}`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(404)
  })

  it('player cannot view DM private entity (gets 404)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${privateEntitySlug}`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(404)
  })
})
