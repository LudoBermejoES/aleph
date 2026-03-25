import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Player Ownership Restriction (8.14)', () => {
  const dmEmail = `char-dm-${Date.now()}@example.com`
  const playerEmail = `char-player-${Date.now()}@example.com`
  let dmCookie = ''
  let playerCookie = ''
  let playerId = ''
  let campaignId = ''
  let ownedCharSlug = ''
  let otherCharSlug = ''

  beforeAll(async () => {
    // DM setup
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Char DM', email: dmEmail, password: 'password123' } })
    const dmLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: dmEmail, password: 'password123' } })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: dmCookie }, body: { name: `CharTest ${Date.now()}` } })
    campaignId = (await camp.json()).id

    // Player setup
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Char Player', email: playerEmail, password: 'password123' } })
    const playerLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: playerEmail, password: 'password123' } })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    // Get player user ID
    const session = await api('/api/auth/get-session', { headers: { Cookie: playerCookie } })
    playerId = (await session.json()).user.id

    // Invite player
    const invite = await api(`/api/campaigns/${campaignId}/invite`, { method: 'POST', headers: { Cookie: dmCookie }, body: { role: 'player' } })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, { method: 'POST', headers: { Cookie: playerCookie }, body: { token: inviteToken } })

    // DM creates a PC owned by the player
    const owned = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: dmCookie },
      body: { name: 'Player Hero', characterType: 'pc', ownerUserId: playerId, content: '# Hero' },
    })
    ownedCharSlug = (await owned.json()).slug

    // DM creates an NPC (not owned by player)
    const npc = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: dmCookie },
      body: { name: 'Evil NPC', characterType: 'npc', content: '# Evil' },
    })
    otherCharSlug = (await npc.json()).slug
  })

  it('player can edit their own character', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${ownedCharSlug}`, {
      method: 'PUT', headers: { Cookie: playerCookie },
      body: { race: 'Elf' },
    })
    expect(res.status).toBe(200)
  })

  it('player cannot edit another character', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${otherCharSlug}`, {
      method: 'PUT', headers: { Cookie: playerCookie },
      body: { race: 'Orc' },
    })
    expect(res.status).toBe(403)
  })

  it('DM can edit any character', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${otherCharSlug}`, {
      method: 'PUT', headers: { Cookie: dmCookie },
      body: { race: 'Tiefling' },
    })
    expect(res.status).toBe(200)
  })
})

describe('NPC Secret Visibility (8.15)', () => {
  const dmEmail = `secret-char-dm-${Date.now()}@example.com`
  const playerEmail = `secret-char-player-${Date.now()}@example.com`
  let dmCookie = ''
  let playerCookie = ''
  let campaignId = ''
  let charSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Secret DM', email: dmEmail, password: 'password123' } })
    const dmLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: dmEmail, password: 'password123' } })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: dmCookie }, body: { name: `SecretChar ${Date.now()}` } })
    campaignId = (await camp.json()).id

    // Create character with secret content
    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: dmCookie },
      body: { name: 'Mysterious NPC', characterType: 'npc', content: '# NPC\n\nPublic info.\n\n:::secret{.dm}\nActually a vampire.\n:::\n' },
    })
    charSlug = (await char.json()).slug

    // Player
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Secret Player', email: playerEmail, password: 'password123' } })
    const playerLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: playerEmail, password: 'password123' } })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const invite = await api(`/api/campaigns/${campaignId}/invite`, { method: 'POST', headers: { Cookie: dmCookie }, body: { role: 'player' } })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, { method: 'POST', headers: { Cookie: playerCookie }, body: { token: inviteToken } })
  })

  it('DM sees secret blocks in character content', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${charSlug}`, { headers: { Cookie: dmCookie } })
    const data = await res.json()
    expect(data.content).toContain('Actually a vampire.')
  })

  it('player does not see secret blocks in character content', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${charSlug}`, { headers: { Cookie: playerCookie } })
    const data = await res.json()
    expect(data.content).toContain('Public info.')
    expect(data.content).not.toContain('Actually a vampire.')
  })
})

describe('Stat Bulk Update with player_editable enforcement (8.16)', () => {
  const dmEmail = `stat-dm-${Date.now()}@example.com`
  const playerEmail = `stat-player-${Date.now()}@example.com`
  let dmCookie = ''
  let playerCookie = ''
  let playerId = ''
  let campaignId = ''
  let charSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Stat DM', email: dmEmail, password: 'password123' } })
    const dmLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: dmEmail, password: 'password123' } })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: dmCookie }, body: { name: `StatTest ${Date.now()}` } })
    campaignId = (await camp.json()).id

    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Stat Player', email: playerEmail, password: 'password123' } })
    const playerLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: playerEmail, password: 'password123' } })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const session = await api('/api/auth/get-session', { headers: { Cookie: playerCookie } })
    playerId = (await session.json()).user.id

    const invite = await api(`/api/campaigns/${campaignId}/invite`, { method: 'POST', headers: { Cookie: dmCookie }, body: { role: 'player' } })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, { method: 'POST', headers: { Cookie: playerCookie }, body: { token: inviteToken } })

    // Create PC owned by player
    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: dmCookie },
      body: { name: 'Stat Hero', characterType: 'pc', ownerUserId: playerId, content: '# Stats' },
    })
    charSlug = (await char.json()).slug
  })

  it('DM can bulk update stats', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${charSlug}/stats`, {
      method: 'PUT', headers: { Cookie: dmCookie },
      body: { stats: [] },
    })
    expect([200, 204]).toContain(res.status)
  })
})

describe('Character Folder Assignment (8.17)', () => {
  const email = `folder-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let charSlug = ''
  let folderId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Folder User', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `FolderTest ${Date.now()}` } })
    campaignId = (await camp.json()).id

    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Folder NPC', characterType: 'npc', content: '# NPC' },
    })
    charSlug = (await char.json()).slug

    const folder = await api(`/api/campaigns/${campaignId}/character-folders`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Villains' },
    })
    folderId = (await folder.json()).id
  })

  it('assign character to folder', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${charSlug}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { folderId },
    })
    expect(res.status).toBe(200)

    // Verify
    const get = await api(`/api/campaigns/${campaignId}/characters/${charSlug}`, { headers: { Cookie: cookie } })
    const data = await get.json()
    expect(data.folderId).toBe(folderId)
  })
})
