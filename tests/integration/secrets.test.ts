import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUp(
  email: string,
  name = 'Test User',
): Promise<{ cookie: string; csrfToken: string }> {
  await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name, email, password: 'password123' },
  })
  const res = await api('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password: 'password123' },
  })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const cookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await api('/api/campaigns', { headers: { Cookie: cookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return { cookie, csrfToken }
}

function withCsrf(cookie: string, csrfToken: string): Record<string, string> {
  return { Cookie: `${cookie}; csrf_token=${csrfToken}`, 'X-CSRF-Token': csrfToken }
}

describe('Secrets API (integration)', () => {
  const ts = Date.now()
  const dmEmail = `secrets-dm-${ts}@example.com`
  const playerEmail = `secrets-player-${ts}@example.com`
  let dmCookie = ''
  let dmCsrfToken = ''
  let playerCookie = ''
  let playerCsrfToken = ''
  let campaignId = ''
  let entitySlug = ''

  beforeAll(async () => {
    ;({ cookie: dmCookie, csrfToken: dmCsrfToken } = await signUp(dmEmail, 'DM User'))
    ;({ cookie: playerCookie, csrfToken: playerCsrfToken } = await signUp(
      playerEmail,
      'Player User',
    ))

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { name: `Secrets Test ${ts}` },
    })
    campaignId = (await campRes.json()).id

    // Create entity
    const entRes = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { name: 'Secret Test Entity', type: 'location' },
    })
    entitySlug = (await entRes.json()).slug

    // Invite and join player
    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie, playerCsrfToken),
      body: { token },
    })
  })

  // Task 9.7: GET secrets - empty array when none
  it('GET /secrets returns empty array when no blocks revealed', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secrets`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(0)
  })

  // Task 9.7: GET secrets - player gets 403
  it('GET /secrets returns 403 for player', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secrets`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(403)
  })

  // Task 9.7: GET secrets - 401 unauthenticated
  it('GET /secrets returns 401 for unauthenticated request', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secrets`)
    expect(res.status).toBe(401)
  })

  // Task 9.5: POST secret - DM can reveal
  it('POST /secrets - DM can reveal a block', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secrets`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { blockId: 'test-block-1' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.revealed).toBe(true)
    expect(data.blockId).toBe('test-block-1')
  })

  // Task 9.5: POST secret - player gets 403
  it('POST /secrets returns 403 for player', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secrets`, {
      method: 'POST',
      headers: withCsrf(playerCookie, playerCsrfToken),
      body: { blockId: 'test-block-1' },
    })
    expect(res.status).toBe(403)
  })

  // Task 9.5: POST secret - 401 unauthenticated
  it('POST /secrets returns 401 for unauthenticated', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secrets`, {
      method: 'POST',
      body: { blockId: 'some-block' },
    })
    expect(res.status).toBe(401)
  })

  // Task 9.7: GET secrets - returns revealed blocks after reveal
  it('GET /secrets returns revealed blocks', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secrets`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    const found = data.find((r: Record<string, unknown>) => r.blockId === 'test-block-1')
    expect(found).toBeDefined()
    expect(found.revealedBy).toBeDefined()
    expect(found.revealedAt).toBeDefined()
  })

  // Task 9.5: POST secret - idempotent (re-reveal already-revealed block)
  it('POST /secrets is idempotent on already-revealed block', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secrets`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { blockId: 'test-block-1' },
    })
    expect(res.status).toBe(200)
  })

  // Task 9.6: DELETE secret - DM can unreveal
  it('DELETE /secrets/:blockId - DM can unreveal', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/entities/${entitySlug}/secrets/test-block-1`,
      {
        method: 'DELETE',
        headers: withCsrf(dmCookie, dmCsrfToken),
      },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.revealed).toBe(false)
    expect(data.blockId).toBe('test-block-1')
  })

  // Task 9.6: DELETE secret - idempotent on non-existent
  it('DELETE /secrets/:blockId is idempotent on non-existent block', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/entities/${entitySlug}/secrets/nonexistent-block`,
      {
        method: 'DELETE',
        headers: withCsrf(dmCookie, dmCsrfToken),
      },
    )
    expect(res.status).toBe(200)
  })

  // Task 9.6: DELETE - player gets 403
  it('DELETE /secrets/:blockId returns 403 for player', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/entities/${entitySlug}/secrets/test-block-1`,
      {
        method: 'DELETE',
        headers: withCsrf(playerCookie, playerCsrfToken),
      },
    )
    expect(res.status).toBe(403)
  })
})

describe('Secret Notes API (integration)', () => {
  const ts = Date.now()
  const dmEmail = `sn-dm-${ts}@example.com`
  const playerEmail = `sn-player-${ts}@example.com`
  let dmCookie = ''
  let dmCsrfToken = ''
  let playerCookie = ''
  let playerCsrfToken = ''
  let campaignId = ''
  let entitySlug = ''

  beforeAll(async () => {
    ;({ cookie: dmCookie, csrfToken: dmCsrfToken } = await signUp(dmEmail, 'SN DM User'))
    ;({ cookie: playerCookie, csrfToken: playerCsrfToken } = await signUp(
      playerEmail,
      'SN Player User',
    ))

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { name: `Secret Notes Test ${ts}` },
    })
    campaignId = (await campRes.json()).id

    const entRes = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { name: 'Note Entity', type: 'location' },
    })
    entitySlug = (await entRes.json()).slug

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie, playerCsrfToken),
      body: { token },
    })
  })

  // Task 9.8: GET secret-notes - empty when no record
  it('GET /secret-notes returns empty content when no record exists', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secret-notes`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toBe('')
  })

  // Task 9.8: GET secret-notes - player gets 403
  it('GET /secret-notes returns 403 for player', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secret-notes`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(403)
  })

  // Task 9.9: PUT secret-notes - DM can upsert
  it('PUT /secret-notes - DM can save notes', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secret-notes`, {
      method: 'PUT',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { content: 'DM private notes here.' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toBe('DM private notes here.')
  })

  // Task 9.8: GET returns saved content
  it('GET /secret-notes returns saved content', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secret-notes`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toBe('DM private notes here.')
  })

  // Task 9.9: PUT - player gets 403
  it('PUT /secret-notes returns 403 for player', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secret-notes`, {
      method: 'PUT',
      headers: withCsrf(playerCookie, playerCsrfToken),
      body: { content: 'Trying to inject notes.' },
    })
    expect(res.status).toBe(403)
  })

  // Task 9.9: PUT - updates on second call (upsert)
  it('PUT /secret-notes upserts on repeat call', async () => {
    await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secret-notes`, {
      method: 'PUT',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { content: 'Updated notes.' },
    })
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secret-notes`, {
      headers: { Cookie: dmCookie },
    })
    const data = await res.json()
    expect(data.content).toBe('Updated notes.')
  })
})

describe('Render endpoint with preview_as (integration)', () => {
  const ts = Date.now()
  const dmEmail = `render-dm-${ts}@example.com`
  const playerEmail = `render-player-${ts}@example.com`
  let dmCookie = ''
  let dmCsrfToken = ''
  let playerCookie = ''
  let playerCsrfToken = ''
  let campaignId = ''
  let entitySlug = ''

  beforeAll(async () => {
    ;({ cookie: dmCookie, csrfToken: dmCsrfToken } = await signUp(dmEmail, 'Render DM'))
    ;({ cookie: playerCookie, csrfToken: playerCsrfToken } = await signUp(
      playerEmail,
      'Render Player',
    ))

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { name: `Render Preview Test ${ts}` },
    })
    campaignId = (await campRes.json()).id

    const entRes = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { name: 'Preview Entity', type: 'location' },
    })
    entitySlug = (await entRes.json()).slug

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie, playerCsrfToken),
      body: { token },
    })
  })

  // Task 9.10: render with preview_as
  it('GET /render returns 200 for DM', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/render`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('content')
    expect(data.previewMode).toBe(false)
  })

  it('GET /render?preview_as=player returns previewMode:true for DM', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/entities/${entitySlug}/render?preview_as=player`,
      {
        headers: { Cookie: dmCookie },
      },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.previewMode).toBe(true)
    expect(data.effectiveRole).toBe('player')
  })

  it("GET /render?preview_as=dm is ignored for player (player can't escalate)", async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/entities/${entitySlug}/render?preview_as=dm`,
      {
        headers: { Cookie: playerCookie },
      },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.previewMode).toBe(false)
    expect(data.effectiveRole).toBe('player')
  })
})
