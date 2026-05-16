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

describe('Session render endpoint (integration)', () => {
  const dmEmail = `render-dm-${Date.now()}@example.com`
  let dmApiKey = ''
  let campaignId = ''
  let sessionSlug = ''
  let entitySlug = ''

  beforeAll(async () => {
    const dmCookie = await signUpAndGetCookie(dmEmail, 'password123', 'RenderDM')
    const dmKeyData = await createApiKey(dmCookie, 'render-dm-key')
    dmApiKey = dmKeyData.key

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: `Render Test ${Date.now()}` },
    })
    campaignId = camp.id

    // Create a character entity so auto-linking has something to match
    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'Zoglin the Bold', characterType: 'npc' },
    })
    entitySlug = char.slug

    const sess = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { title: 'Render Test Session', status: 'completed' },
    })
    sessionSlug = sess.slug

    // Upload content that references the entity by name
    await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { type: 'summary', content: 'The party defeated Zoglin the Bold in the cave.' },
    })
    await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { type: 'manual_notes', content: 'Notes: Zoglin the Bold was the boss.' },
    })
  })

  it('GET /render?type=summary returns auto-linked content', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/render?type=summary`,
      { headers: { 'X-API-Key': dmApiKey } },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data.content).toBe('string')
    expect(data.content).toContain(':entity-link{')
    expect(data.content).toContain(`slug="${entitySlug}"`)
    expect(data.content).toContain('name="')
    expect(data.content).not.toContain('label="')
  })

  it('GET /render?type=manual_notes returns auto-linked content', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/render?type=manual_notes`,
      { headers: { 'X-API-Key': dmApiKey } },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toContain(':entity-link{')
  })

  it('GET /render?type=ai_notes with no content returns empty string', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/render?type=ai_notes`,
      { headers: { 'X-API-Key': dmApiKey } },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toBe('')
  })

  it('GET /render without type still returns session log content', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/render`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data.content).toBe('string')
    expect(typeof data.effectiveRole).toBe('string')
  })

  it('GET /render?type=invalid returns log content (unknown type falls through)', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/render?type=invalid`,
      { headers: { 'X-API-Key': dmApiKey } },
    )
    expect(res.status).toBe(200)
  })
})
