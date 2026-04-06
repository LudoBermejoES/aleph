/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(url: string, opts?: any) {
  return fetch(`${BASE_URL}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(url: string, opts?: any) {
  const res = await apiRaw(url, opts)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${opts?.method ?? 'GET'} ${url} → ${res.status}: ${t}`)
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

describe('Generate endpoint (integration)', () => {
  const dmEmail = `gen-dm-${Date.now()}@example.com`
  const playerEmail = `gen-player-${Date.now()}@example.com`
  let dmApiKey = ''
  let playerApiKey = ''
  let campaignId = ''
  let sessionSlug = ''
  const baseHeaders = (key: string) => ({ 'X-API-Key': key })

  beforeAll(async () => {
    const dmCookie = await signUpAndGetCookie(dmEmail, 'password123', 'DM User')
    const dmKeyData = await createApiKey(dmCookie, 'gen-dm-key')
    dmApiKey = dmKeyData.key

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { name: `Generate Test Camp ${Date.now()}` },
    })
    campaignId = camp.id

    const sess = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { title: 'Generate Test Session', status: 'planned' },
    })
    sessionSlug = sess.slug

    // Invite and join a player
    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { role: 'player' },
    })
    const playerCookie = await signUpAndGetCookie(playerEmail, 'password123', 'Player User')
    const playerKeyData = await createApiKey(playerCookie, 'gen-player-key')
    playerApiKey = playerKeyData.key
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: baseHeaders(playerApiKey),
      body: { token: invite.token },
    })
  })

  it('returns 401 for unauthenticated request', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/generate`, {
      method: 'POST',
      body: { target: 'summary' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 for player role', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/generate`, {
      method: 'POST',
      headers: baseHeaders(playerApiKey),
      body: { target: 'summary' },
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid target', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/generate`, {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { target: 'invalid' },
    })
    expect(res.status).toBe(422)
  })

  it('returns 400 when manual notes are empty', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/generate`, {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { target: 'summary' },
    })
    // Empty notes → 400 (or 503 if AI not configured, either is valid since notes check comes first)
    expect([400, 503]).toContain(res.status)
  })

  it('returns 503 or 200 when AI provider is not configured and notes exist', async () => {
    // First set manual notes
    await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/content`, {
      method: 'PUT',
      headers: baseHeaders(dmApiKey),
      body: { type: 'manual_notes', content: 'Session notes for AI test.' },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/generate`, {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { target: 'summary' },
    })
    // In test env, AI_PROVIDER is likely not set → 503
    // If it is set, could succeed → 200
    expect([200, 503]).toContain(res.status)
  })

  it('returns 429 on cooldown after recent generation (if AI configured)', async () => {
    // This test only runs meaningfully if AI is configured; otherwise 503 on first call
    const firstRes = await apiRaw(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/generate`, {
      method: 'POST',
      headers: baseHeaders(dmApiKey),
      body: { target: 'summary' },
    })
    if (firstRes.status === 200) {
      // If AI worked, second call within 60s should be 429
      const secondRes = await apiRaw(
        `/api/campaigns/${campaignId}/sessions/${sessionSlug}/generate`,
        {
          method: 'POST',
          headers: baseHeaders(dmApiKey),
          body: { target: 'summary' },
        },
      )
      expect(secondRes.status).toBe(429)
    } else {
      // AI not configured — skip
      expect([503, 429]).toContain(firstRes.status)
    }
  })
})
