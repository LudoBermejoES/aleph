import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const res = await apiRaw(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
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

async function createApiKey(cookie: string, keyName = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name: keyName },
  })
  return res.json()
}

describe('Arc and chapter descriptions are auto-linked (integration)', () => {
  const ts = Date.now()
  const email = `arc-autolink-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let characterSlug = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'arc-autolink-key')
    apiKey = keyData.key

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Arc Autolink Test ${ts}` },
    })
    campaignId = camp.id

    const character = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Julia Kirchner ${ts}` },
    })
    characterSlug = character.slug

    await api(`/api/campaigns/${campaignId}/entities/${characterSlug}/nicknames`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { nickname: `Julia${ts}` },
    })
  })

  it('links a character name in an arc description', async () => {
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        name: `Act I ${ts}`,
        description: `The party met Julia Kirchner ${ts} in the docks.`,
      },
    })

    const arcList = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const found = arcList.find((a: Record<string, unknown>) => a.id === arc.id)
    expect(found.description).toContain(`:entity-link{slug="${characterSlug}"`)
  })

  it('links a character nickname in a chapter description', async () => {
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Act II ${ts}` },
    })

    await api(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        arcId: arc.id,
        name: `The Ambush ${ts}`,
        description: `Julia${ts}'s warning came too late.`,
      },
    })

    const arcList = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const found = arcList.find((a: Record<string, unknown>) => a.id === arc.id)
    expect(
      found.chapters.some((c: Record<string, unknown>) =>
        (c.description as string).includes(`:entity-link{slug="${characterSlug}"`),
      ),
    ).toBe(true)
  })

  it('strips a DM-only secret block before auto-linking, for a player role', async () => {
    const secretText = `:::secret{.dm}\nJulia${ts} is secretly a double agent.\n:::\n`
    const arc = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Act III ${ts}`, description: secretText },
    })

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const playerCookie = await signUpAndGetCookie(`arc-autolink-player-${ts}@example.com`)
    const playerKeyData = await createApiKey(playerCookie, 'arc-autolink-player-key')
    const playerApiKey = playerKeyData.key
    const playerCsrfMatch = playerCookie.match(/csrf_token=([^;]+)/)
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': playerCsrfMatch?.[1] || '' },
      body: { token: invite.token },
    })

    const arcList = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': playerApiKey },
    })
    const found = arcList.find((a: Record<string, unknown>) => a.id === arc.id)
    expect(found.description).not.toContain(':entity-link')
    expect(found.description).not.toContain(`Julia${ts} is secretly`)
  })
})
