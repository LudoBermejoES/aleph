import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Search Permission Filtering (6.11)', () => {
  const dmEmail = `md-dm-${Date.now()}@example.com`
  const playerEmail = `md-player-${Date.now()}@example.com`
  let dmCookie = ''
  let playerCookie = ''
  let campaignId = ''

  beforeAll(async () => {
    // DM setup
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'MD DM', email: dmEmail, password: 'password123' } })
    const dmLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: dmEmail, password: 'password123' } })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: dmCookie }, body: { name: `MD Test ${Date.now()}` } })
    campaignId = (await camp.json()).id

    // Create entities with different visibility levels
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: dmCookie },
      body: { name: 'Public Entity', type: 'note', content: '# Public\n\nVisible to all.', visibility: 'public' },
    })
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: dmCookie },
      body: { name: 'DM Only Entity', type: 'note', content: '# DM Only\n\nSecret DM notes.', visibility: 'dm_only' },
    })

    // Player setup
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'MD Player', email: playerEmail, password: 'password123' } })
    const playerLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: playerEmail, password: 'password123' } })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    // Invite player
    const invite = await api(`/api/campaigns/${campaignId}/invite`, { method: 'POST', headers: { Cookie: dmCookie }, body: { role: 'player' } })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, { method: 'POST', headers: { Cookie: playerCookie }, body: { token: inviteToken } })
  })

  it('DM search returns all entities including dm_only', async () => {
    const res = await api(`/api/campaigns/${campaignId}/search?q=Entity`, { method: 'GET', headers: { Cookie: dmCookie } })
    const data = await res.json()
    const names = data.results?.map((r: any) => r.name) || []
    expect(names).toContain('Public Entity')
    expect(names).toContain('DM Only Entity')
  })

  it('player search excludes dm_only entities', async () => {
    const res = await api(`/api/campaigns/${campaignId}/search?q=Entity`, { method: 'GET', headers: { Cookie: playerCookie } })
    const data = await res.json()
    const names = data.results?.map((r: any) => r.name) || []
    expect(names).toContain('Public Entity')
    expect(names).not.toContain('DM Only Entity')
  })
})

describe('Secret Block Rendering (6.12, 6.13)', () => {
  const dmEmail = `secret-dm-${Date.now()}@example.com`
  const playerEmail = `secret-player-${Date.now()}@example.com`
  let dmCookie = ''
  let playerCookie = ''
  let campaignId = ''
  let entitySlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Secret DM', email: dmEmail, password: 'password123' } })
    const dmLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: dmEmail, password: 'password123' } })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: dmCookie }, body: { name: `Secret Test ${Date.now()}` } })
    campaignId = (await camp.json()).id

    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: dmCookie },
      body: { name: 'Secret Entity', type: 'note', content: '# Lore\n\nPublic info.\n\n:::secret{.dm}\nHidden treasure location.\n:::\n' },
    })
    entitySlug = (await entity.json()).slug

    // Player setup
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Secret Player', email: playerEmail, password: 'password123' } })
    const playerLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: playerEmail, password: 'password123' } })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const invite = await api(`/api/campaigns/${campaignId}/invite`, { method: 'POST', headers: { Cookie: dmCookie }, body: { role: 'player' } })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, { method: 'POST', headers: { Cookie: playerCookie }, body: { token: inviteToken } })
  })

  it('DM receives full content including secret blocks (6.13)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, { method: 'GET', headers: { Cookie: dmCookie } })
    const data = await res.json()
    expect(data.content).toContain('Public info.')
    expect(data.content).toContain('Hidden treasure location.')
  })

  it('player content has secret blocks stripped (6.12)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, { method: 'GET', headers: { Cookie: playerCookie } })
    const data = await res.json()
    expect(data.content).toContain('Public info.')
    // Secret block content should be stripped for non-DM
    // Note: if secret stripping isn't implemented in the API yet, this tests the expected behavior
    expect(data.content).not.toContain('Hidden treasure location.')
  })
})
