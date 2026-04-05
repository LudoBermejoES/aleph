import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: any }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUp(email: string, name = 'Test User') {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password: 'password123' } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  return match ? `better-auth.session_token=${match[1]}` : ''
}

describe('Campaign Export API (integration)', () => {
  const ts = Date.now()
  const dmEmail = `export-dm-${ts}@example.com`
  const playerEmail = `export-player-${ts}@example.com`
  const outsiderEmail = `export-outsider-${ts}@example.com`
  let dmCookie = ''
  let playerCookie = ''
  let outsiderCookie = ''
  let campaignId = ''
  let campaignSlug = ''

  beforeAll(async () => {
    dmCookie = await signUp(dmEmail, 'Export DM')
    playerCookie = await signUp(playerEmail, 'Export Player')
    outsiderCookie = await signUp(outsiderEmail, 'Export Outsider')

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie },
      body: { name: `Export Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id
    campaignSlug = camp.slug

    // Invite and add player
    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { Cookie: dmCookie },
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token },
    })
  })

  // Task 7.6: DM gets 200 with valid JSON
  it('GET /export returns 200 with valid JSON for DM', async () => {
    const res = await api(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.version).toBe('1.0')
    expect(data.generator).toBe('aleph')
    expect(data.exportedAt).toBeTruthy()
    expect(data.campaign).toMatchObject({ id: campaignId })
  })

  // Task 7.7: Content-Disposition header with filename
  it('GET /export includes Content-Disposition header with correct filename', async () => {
    const res = await api(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const disposition = res.headers.get('content-disposition') || ''
    expect(disposition).toContain('attachment')
    expect(disposition).toContain(campaignSlug)
    expect(disposition).toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(disposition).toContain('.json')
  })

  // Task 7.8: Selective export
  it('GET /export?include=entities,characters returns only those types', async () => {
    const res = await api(`/api/campaigns/${campaignId}/export?include=entities,characters`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('campaign')
    expect(data).toHaveProperty('entities')
    expect(data).toHaveProperty('characters')
    expect(data).not.toHaveProperty('sessions')
    expect(data).not.toHaveProperty('maps')
    expect(data).not.toHaveProperty('rolls')
  })

  // Task 7.9: Player gets 403
  it('GET /export returns 403 for player role', async () => {
    const res = await api(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(403)
  })

  // Task 7.10: Unauthenticated gets 401
  it('GET /export returns 401 for unauthenticated request', async () => {
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/export`)
    expect(res.status).toBe(401)
  })

  // Task 7.11: Non-existent campaign 404
  it('GET /export returns 404 for non-existent campaign', async () => {
    const res = await api(`/api/campaigns/nonexistent-campaign-id/export`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(404)
  })

  // Task 7.12: Non-member gets 403
  it('GET /export returns 403 for non-member', async () => {
    const res = await api(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: outsiderCookie },
    })
    expect(res.status).toBe(403)
  })

  // Extra: Invalid include keys are silently ignored
  it('GET /export ignores invalid include keys', async () => {
    const res = await api(`/api/campaigns/${campaignId}/export?include=entities,foobar`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('entities')
    expect(data).not.toHaveProperty('foobar')
  })
})
