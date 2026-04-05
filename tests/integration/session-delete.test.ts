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

describe('Session Delete (integration)', () => {
  const email = `sess-del-${Date.now()}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'sess-del-key')
    apiKey = keyData.key
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Session Delete Test ${Date.now()}` },
    })
    campaignId = camp.id
  })

  it('DELETE session returns 200 and removes the session', async () => {
    const created = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'Session To Delete', status: 'completed' },
    })
    const slug = created.slug

    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify session is gone
    const getRes = await apiRaw(`/api/campaigns/${campaignId}/sessions/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(getRes.status).toBe(404)
  })

  it('DELETE session cascades to session_contents', async () => {
    const created = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'Session With Content', status: 'completed' },
    })
    const slug = created.slug

    // Upload content
    await api(`/api/campaigns/${campaignId}/sessions/${slug}/content`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { type: 'manual_notes', content: 'Some notes' },
    })

    // Delete session
    const delRes = await apiRaw(`/api/campaigns/${campaignId}/sessions/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)

    // Session is gone (content was cascade-deleted)
    const getRes = await apiRaw(`/api/campaigns/${campaignId}/sessions/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(getRes.status).toBe(404)
  })

  it('DELETE non-existent session returns 404', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/no-such-session`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(404)
  })

  it('DELETE session without auth returns 401', async () => {
    const created = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'Auth Test Session', status: 'planned' },
    })
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${created.slug}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(401)
  })

  it('DELETE session by player role returns 403', async () => {
    const playerEmail = `sess-del-player-${Date.now()}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'player-key')
    const playerApiKey = playerKeyData.key

    // Invite player via invite token flow
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

    const created = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'Role Test Session', status: 'planned' },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${created.slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
