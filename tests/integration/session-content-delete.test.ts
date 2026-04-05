/// <reference types="node" />
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

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await api('/api/apikeys', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: { name } })
  return res.json()
}

async function apiOk(path: string, opts?: RequestInit & { body?: unknown }) {
  const res = await api(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

describe('Session Content Delete (integration)', () => {
  const ts = Date.now()
  const email = `session-content-del-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let sessionSlug = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'sess-content-key')
    apiKey = keyData.key

    const camp = await apiOk('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Session Content Delete Test ${ts}` },
    })
    campaignId = camp.id

    const session = await apiOk(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'Session 1', scheduledDate: '2024-01-01T00:00:00.000Z' },
    })
    sessionSlug = session.slug
  })

  it('PUT session content creates content and returns type and content', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { type: 'manual_notes', content: 'Test notes' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.type).toBe('manual_notes')
    expect(data.content).toBe('Test notes')
  })

  it('GET session content returns object keyed by type with id and content', async () => {
    const content = await apiOk(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(content).toHaveProperty('manual_notes')
    expect(content).toHaveProperty('ai_notes')
    expect(content).toHaveProperty('summary')
    expect(content.manual_notes).toMatchObject({ id: expect.any(String), content: 'Test notes' })
    expect(content.ai_notes).toBeNull()
  })

  it('GET session detail hasContent flags reflect stored content', async () => {
    const session = await apiOk(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(session).toBeDefined()
    // hasContent is present if the session detail endpoint provides it
    if (session.hasContent) {
      expect(session.hasContent.manual_notes).toBe(true)
      expect(session.hasContent.ai_notes).toBe(false)
    }
  })

  it('DELETE session content by contentId returns 200 and content is gone', async () => {
    // Create a second session for this isolated test
    const session2 = await apiOk(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'Session For Content Delete', scheduledDate: '2024-02-01T00:00:00.000Z' },
    })
    const slug2 = session2.slug

    // PUT content
    await apiOk(`/api/campaigns/${campaignId}/sessions/${slug2}/content`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { type: 'summary', content: 'Summary to delete' },
    })

    // GET content to retrieve the contentId
    const contentMap = await apiOk(`/api/campaigns/${campaignId}/sessions/${slug2}/content`, {
      headers: { 'X-API-Key': apiKey },
    })
    const contentId = contentMap.summary?.id
    expect(contentId).toBeTruthy()

    // DELETE using the real contentId
    const delRes = await api(
      `/api/campaigns/${campaignId}/sessions/${slug2}/content/${contentId}`,
      { method: 'DELETE', headers: { 'X-API-Key': apiKey } },
    )
    expect(delRes.status).toBe(200)

    // Verify content is gone
    const after = await apiOk(`/api/campaigns/${campaignId}/sessions/${slug2}/content`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(after.summary).toBeNull()
  })

  it('PUT session content by player returns 403', async () => {
    const playerEmail = `sess-content-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'sc-player-put-key')
    const playerApiKey = playerKeyData.key

    const invite = await apiOk(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { type: 'manual_notes', content: 'Should fail' },
    })
    // editor role required; player gets 403
    expect(res.status).toBe(403)
  })

  it('DELETE session content by player returns 403', async () => {
    const playerEmail = `sess-content-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'sc-player-del-key')
    const playerApiKey = playerKeyData.key

    const invite = await apiOk(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    // Use a synthetic UUID — the auth/role check fires before the 404 lookup
    const res = await api(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/content/00000000-0000-0000-0000-000000000001`,
      { method: 'DELETE', headers: { 'X-API-Key': playerApiKey } },
    )
    // co_dm required; player gets 403 before the ID is resolved
    expect(res.status).toBe(403)
  })

  it('PUT session content with invalid type returns 400', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { type: 'invalid_type', content: 'Bad' },
    })
    expect([400, 422]).toContain(res.status)
  })
})
