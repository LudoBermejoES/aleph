import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function getCsrfToken(sessionCookie: string): Promise<string> {
  const res = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = res.headers.get('set-cookie') || ''
  const match = setCookie.match(/csrf_token=([^;]+)/)
  return match?.[1] || ''
}

function withCsrf(cookie: string, csrfToken: string): Record<string, string> {
  return { Cookie: `${cookie}; csrf_token=${csrfToken}`, 'X-CSRF-Token': csrfToken }
}

describe('Entity List Permission Filtering (7.9)', () => {
  const dmEmail = `wiki-dm-${Date.now()}@example.com`
  const playerEmail = `wiki-player-${Date.now()}@example.com`
  let dmCookie = ''
  let dmCsrfToken = ''
  let playerCookie = ''
  let playerCsrfToken = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Wiki DM', email: dmEmail, password: 'password123' },
    })
    const dmLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dmEmail, password: 'password123' },
    })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    dmCsrfToken = await getCsrfToken(dmCookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { name: `Wiki Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create entities with various visibility
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: {
        name: 'Public NPC',
        type: 'character',
        content: '# Public NPC',
        visibility: 'members',
      },
    })
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: {
        name: 'Secret NPC',
        type: 'character',
        content: '# Secret NPC',
        visibility: 'dm_only',
      },
    })

    // Player setup
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Wiki Player', email: playerEmail, password: 'password123' },
    })
    const playerLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: playerEmail, password: 'password123' },
    })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    playerCsrfToken = await getCsrfToken(playerCookie)

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrfToken),
      body: { role: 'player' },
    })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie, playerCsrfToken),
      body: { token: inviteToken },
    })
  })

  it('DM entity list includes dm_only entities', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'GET',
      headers: { Cookie: dmCookie },
    })
    const data = await res.json()
    const names = data.entities?.map((e: any) => e.name) || []
    expect(names).toContain('Public NPC')
    expect(names).toContain('Secret NPC')
  })

  it('player entity list excludes dm_only entities', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'GET',
      headers: { Cookie: playerCookie },
    })
    const data = await res.json()
    const names = data.entities?.map((e: any) => e.name) || []
    expect(names).toContain('Public NPC')
    expect(names).not.toContain('Secret NPC')
  })
})

describe('Custom Field Values (7.12)', () => {
  const email = `wiki-fields-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'FieldUser', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    csrfToken = await getCsrfToken(cookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: `Fields ${Date.now()}` },
    })
    campaignId = (await camp.json()).id
  })

  it('entity stores and returns custom field values from frontmatter', async () => {
    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: {
        name: 'Custom Fields NPC',
        type: 'character',
        content: '# Test',
        fields: { alignment: 'chaotic evil', level: 15, class: 'vampire' },
      },
    })
    const data = await entity.json()

    const get = await api(`/api/campaigns/${campaignId}/entities/${data.slug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const entityData = await get.json()
    expect(entityData.fields?.alignment).toBe('chaotic evil')
    expect(entityData.fields?.level).toBe(15)
    expect(entityData.fields?.class).toBe('vampire')
  })
})
