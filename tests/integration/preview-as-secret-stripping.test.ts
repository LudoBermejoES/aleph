import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
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
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, keyName = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name: keyName },
  })
  return res.json()
}

const SECRET_CONTENT = 'Public text.\n\n:::secret{.dm}\nDM-only secret.\n:::\n'

describe('GET /api/campaigns/:id/arcs — secret stripping (integration)', () => {
  const ts = Date.now()
  const email = `arcs-secret-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, `arcs-secret-key-${ts}`)
    apiKey = keyData.key

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Arc Secret Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id

    await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Secret Arc', description: SECRET_CONTENT, status: 'active' },
    })
  })

  it('DM role receives description with secret block intact', async () => {
    const res = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const arcs = await res.json()
    const arc = arcs.find((a: Record<string, unknown>) => a.name === 'Secret Arc')
    expect(arc).toBeDefined()
    expect(arc.description).toContain('DM-only secret')
  })

  it('player role strips secret blocks from arc descriptions', async () => {
    // Invite player
    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()

    // Register player
    const playerEmail = `arcs-player-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail, 'password123', 'Player User')
    const csrfMatch = playerCookie.match(/csrf_token=([^;]+)/)
    const csrfToken = csrfMatch?.[1] || ''
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': csrfToken },
      body: { token },
    })

    const playerApiKeyData = await createApiKey(playerCookie, `arcs-player-key-${ts}`)
    const playerApiKey = playerApiKeyData.key

    const res = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(200)
    const arcs = await res.json()
    const arc = arcs.find((a: Record<string, unknown>) => a.name === 'Secret Arc')
    expect(arc).toBeDefined()
    expect(arc.description).toContain('Public text')
    expect(arc.description).not.toContain('DM-only secret')
  })

  it('DM with preview_as=player gets description with secrets stripped', async () => {
    const res = await api(`/api/campaigns/${campaignId}/arcs?preview_as=player`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const arcs = await res.json()
    const arc = arcs.find((a: Record<string, unknown>) => a.name === 'Secret Arc')
    expect(arc).toBeDefined()
    expect(arc.description).toContain('Public text')
    expect(arc.description).not.toContain('DM-only secret')
  })
})

describe('GET /api/campaigns/:id/quests/:slug — secret stripping (integration)', () => {
  const ts = Date.now()
  const email = `quests-secret-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let questSlug = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, `quests-secret-key-${ts}`)
    apiKey = keyData.key

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Quest Secret Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id

    const questRes = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Secret Quest', description: SECRET_CONTENT, status: 'active' },
    })
    const quest = await questRes.json()
    questSlug = quest.slug
  })

  it('DM role receives quest description with secret block intact', async () => {
    const res = await api(`/api/campaigns/${campaignId}/quests/${questSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const quest = await res.json()
    expect(quest.description).toContain('DM-only secret')
    expect(quest.description).toContain('Public text')
  })

  it('DM with preview_as=player gets quest description with secrets stripped', async () => {
    const res = await api(`/api/campaigns/${campaignId}/quests/${questSlug}?preview_as=player`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const quest = await res.json()
    expect(quest.description).toContain('Public text')
    expect(quest.description).not.toContain('DM-only secret')
  })
})

describe('GET /api/campaigns/:id/sessions/:slug/render — secret stripping (integration)', () => {
  const ts = Date.now()
  const email = `sessions-secret-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let sessionSlug = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, `sessions-secret-key-${ts}`)
    apiKey = keyData.key

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Session Secret Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id

    const sessionRes = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        title: 'Secret Session',
        content: `# Secret Session\n\nPublic recap.\n\n:::secret{.dm}\nDM-only session secret.\n:::\n`,
        status: 'completed',
      },
    })
    const session = await sessionRes.json()
    sessionSlug = session.slug
  })

  it('DM render returns content with secret block intact', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/render`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toContain('DM-only session secret')
    expect(data.content).toContain('Public recap')
    expect(data.previewMode).toBe(false)
  })

  it('DM render with preview_as=player returns stripped content', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/render?preview_as=player`,
      { headers: { 'X-API-Key': apiKey } },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toContain('Public recap')
    expect(data.content).not.toContain('DM-only session secret')
    expect(data.previewMode).toBe(true)
    expect(data.effectiveRole).toBe('player')
  })
})
