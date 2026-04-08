import { describe, it, expect, beforeAll } from 'vitest'
import { WebSocket } from 'ws'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const WS_BASE = BASE_URL.replace('http', 'ws')
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3334'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
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

function withCsrf(cookie: string, csrfToken: string) {
  return { Cookie: `${cookie}; csrf_token=${csrfToken}`, 'X-CSRF-Token': csrfToken }
}

function connectHocuspocus(
  documentName: string,
  token: string,
): Promise<{ provider: HocuspocusProvider; connected: boolean; error?: string }> {
  return new Promise((resolve) => {
    let resolved = false
    const ydoc = new Y.Doc()

    const provider = new HocuspocusProvider({
      url: WS_URL,
      name: documentName,
      document: ydoc,
      token,
      onAuthenticated() {
        if (!resolved) {
          resolved = true
          resolve({ provider, connected: true })
        }
      },
      onAuthenticationFailed({ reason }: { reason: string }) {
        if (!resolved) {
          resolved = true
          resolve({ provider, connected: false, error: reason })
        }
      },
    })

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        provider.destroy()
        resolve({ provider, connected: false, error: 'timeout' })
      }
    }, 8000)
  })
}

describe('Hocuspocus Authentication (integration)', () => {
  const dmEmail = `collab-dm-${Date.now()}@example.com`
  const playerEmail = `collab-player-${Date.now()}@example.com`
  let dmToken = '' // raw session token for Hocuspocus
  let dmCookie = '' // full cookie string for HTTP requests
  let dmCsrf = ''
  let playerToken = ''
  let playerCookie = ''
  let playerCsrf = ''
  let campaignId = ''
  let entitySlug = ''

  beforeAll(async () => {
    // Register DM user
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Collab DM', email: dmEmail, password: 'password123' },
    })
    const dmLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dmEmail, password: 'password123' },
    })
    dmToken =
      (dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1] ||
      ''
    dmCookie = `better-auth.session_token=${dmToken}`
    dmCsrf = await getCsrfToken(dmCookie)

    // Create campaign
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: `Collab Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create an entity to collaborate on
    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: {
        name: 'Collab Test Entity',
        type: 'character',
        content: '# Test Entity\n\nSome content.',
      },
    })
    const entityData = await entity.json()
    entitySlug = entityData.slug

    // Register player user
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Collab Player', email: playerEmail, password: 'password123' },
    })
    const playerLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: playerEmail, password: 'password123' },
    })
    playerToken =
      (playerLogin.headers.get('set-cookie') || '').match(
        /better-auth\.session_token=([^;]+)/,
      )?.[1] || ''
    playerCookie = `better-auth.session_token=${playerToken}`
    playerCsrf = await getCsrfToken(playerCookie)

    // Add player to campaign via invite/join flow as 'player' role (not editor)
    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { role: 'player' },
    })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie, playerCsrf),
      body: { token: inviteToken },
    })
  })

  it('DM (editor+ role) can connect to Hocuspocus', async () => {
    const docName = `campaign:${campaignId}:entity:${entitySlug}`
    const { provider, connected } = await connectHocuspocus(docName, dmToken)
    expect(connected).toBe(true)
    provider.destroy()
  })

  it('player role is rejected by Hocuspocus (insufficient permissions)', async () => {
    const docName = `campaign:${campaignId}:entity:${entitySlug}`
    const { provider, connected } = await connectHocuspocus(docName, playerToken)
    expect(connected).toBe(false)
    provider.destroy()
  })

  it('invalid token is rejected by Hocuspocus', async () => {
    const docName = `campaign:${campaignId}:entity:${entitySlug}`
    const { provider, connected } = await connectHocuspocus(docName, 'invalid-token-xxx')
    expect(connected).toBe(false)
    provider.destroy()
  })

  it('invalid document name format is rejected', async () => {
    const { provider, connected } = await connectHocuspocus('bad-format', dmToken)
    expect(connected).toBe(false)
    provider.destroy()
  })

  it('non-member cannot connect', async () => {
    const outsiderEmail = `outsider-${Date.now()}@example.com`
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Outsider', email: outsiderEmail, password: 'password123' },
    })
    const outsiderLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: outsiderEmail, password: 'password123' },
    })
    const outsiderCookie =
      (outsiderLogin.headers.get('set-cookie') || '').match(
        /better-auth\.session_token=([^;]+)/,
      )?.[1] || ''

    const docName = `campaign:${campaignId}:entity:${entitySlug}`
    const { provider, connected } = await connectHocuspocus(docName, outsiderCookie)
    expect(connected).toBe(false)
    provider.destroy()
  })
})

describe('Save Pipeline (integration)', () => {
  const email = `save-pipe-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'SavePipe', email, password: 'password123' },
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
      body: { name: `SavePipe ${Date.now()}` },
    })
    campaignId = (await camp.json()).id
  })

  it('entity content is persisted after creation and retrievable', async () => {
    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: {
        name: 'Save Test NPC',
        type: 'character',
        content: '# Save Test NPC\n\nOriginal content.',
      },
    })
    expect(entity.status).toBe(200)
    const data = await entity.json()
    expect(data.slug).toBeDefined()

    // Fetch entity and verify content
    const get = await api(`/api/campaigns/${campaignId}/entities/${data.slug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const entityData = await get.json()
    expect(entityData.content).toContain('Original content.')
  })

  it('entity content_hash is set after creation', async () => {
    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: {
        name: 'Hash Test NPC',
        type: 'character',
        content: '# Hash Test\n\nContent for hash.',
      },
    })
    const data = await entity.json()

    const get = await api(`/api/campaigns/${campaignId}/entities/${data.slug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const entityData = await get.json()
    // content_hash should be a 32-char hex MD5 string
    expect(entityData.contentHash).toMatch(/^[a-f0-9]{32}$/)
  })

  it('updating entity content changes the content_hash', async () => {
    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'Hash Change NPC', type: 'character', content: '# Before\n\nInitial.' },
    })
    const data = await entity.json()

    const get1 = await api(`/api/campaigns/${campaignId}/entities/${data.slug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const hash1 = (await get1.json()).contentHash

    // Update the entity content
    await api(`/api/campaigns/${campaignId}/entities/${data.slug}`, {
      method: 'PUT',
      headers: withCsrf(cookie, csrfToken),
      body: { content: '# After\n\nModified content.' },
    })

    const get2 = await api(`/api/campaigns/${campaignId}/entities/${data.slug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const hash2 = (await get2.json()).contentHash

    expect(hash1).not.toBe(hash2)
  })

  it('FTS5 re-index: new content is searchable after update', async () => {
    const uniqueTerm = `xyzzyqwert${Date.now()}`

    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: {
        name: 'FTS Reindex NPC',
        type: 'character',
        content: '# FTS Test\n\nGeneric content.',
      },
    })
    const data = await entity.json()

    // Search for unique term — should not be found
    const search1 = await api(`/api/campaigns/${campaignId}/search?q=${uniqueTerm}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const results1 = await search1.json()
    expect(results1.results?.length || 0).toBe(0)

    // Update entity with unique term
    await api(`/api/campaigns/${campaignId}/entities/${data.slug}`, {
      method: 'PUT',
      headers: withCsrf(cookie, csrfToken),
      body: { content: `# FTS Test\n\nThis contains ${uniqueTerm} for searching.` },
    })

    // Search again — should now find it
    const search2 = await api(`/api/campaigns/${campaignId}/search?q=${uniqueTerm}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const results2 = await search2.json()
    expect(results2.results?.length).toBeGreaterThanOrEqual(1)
  })
})

// --- CrossWS WebSocket Integration Tests ---

/** Fetch a short-lived WS token using a session cookie */
async function getWsToken(sessionCookie: string): Promise<string> {
  const res = await api('/api/ws/token', {
    method: 'GET',
    headers: { Cookie: `better-auth.session_token=${sessionCookie}` },
  })
  const data = await res.json()
  return data.token
}

function connectCampaignWs(
  token: string,
  campaignId: string,
): Promise<{ ws: WebSocket; messages: Record<string, unknown>[]; connected: boolean }> {
  return new Promise((resolve) => {
    let resolved = false
    const messages: Record<string, unknown>[] = []
    const ws = new WebSocket(
      `${WS_BASE}/api/ws?token=${encodeURIComponent(token)}&campaignId=${encodeURIComponent(campaignId)}`,
    )

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve({ ws, messages, connected: false })
      }
    }, 5000)

    ws.on('open', () => {
      // Server validates after WS open — wait to see if it closes us
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          resolve({ ws, messages, connected: true })
        }
      }, 1500)
    })

    ws.on('message', (data: Buffer) => {
      try {
        messages.push(JSON.parse(data.toString()))
      } catch {
        /* ignore */
      }
    })

    ws.on('error', () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        resolve({ ws, messages, connected: false })
      }
    })

    ws.on('close', (_code: number) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        resolve({ ws, messages, connected: false })
      }
    })
  })
}

describe('CrossWS /api/ws Authentication (integration)', () => {
  const dmEmail = `ws-dm-${Date.now()}@example.com`
  let dmToken = ''
  let dmCookie = ''
  let dmCsrf = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'WS DM', email: dmEmail, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dmEmail, password: 'password123' },
    })
    dmToken =
      (login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1] || ''
    dmCookie = `better-auth.session_token=${dmToken}`
    dmCsrf = await getCsrfToken(dmCookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: `WS Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id
  })

  it('authenticated member connects and receives presence:list', async () => {
    const wsToken = await getWsToken(dmToken)
    const { ws, messages, connected } = await connectCampaignWs(wsToken, campaignId)
    expect(connected).toBe(true)
    const presenceMsg = messages.find((m) => m.type === 'presence:list')
    expect(presenceMsg).toBeDefined()
    expect((presenceMsg as Record<string, unknown>).users).toBeInstanceOf(Array)
    ws.close()
  })

  it('invalid token is rejected', async () => {
    const { ws, connected } = await connectCampaignWs('invalid-xxx', campaignId)
    expect(connected).toBe(false)
    ws.close()
  })

  it('missing campaignId is rejected', async () => {
    const wsToken = await getWsToken(dmToken)
    const { ws, connected } = await connectCampaignWs(wsToken, '')
    expect(connected).toBe(false)
    ws.close()
  })

  it('non-member is rejected', async () => {
    const outsiderEmail = `ws-outsider-${Date.now()}@example.com`
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'WS Outsider', email: outsiderEmail, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: outsiderEmail, password: 'password123' },
    })
    const outsiderCookie =
      (login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1] || ''
    const outsiderWsToken = await getWsToken(outsiderCookie)

    const { ws, connected } = await connectCampaignWs(outsiderWsToken, campaignId)
    expect(connected).toBe(false)
    ws.close()
  })
})

describe('CrossWS Presence (integration)', () => {
  const dm1Email = `ws-pres1-${Date.now()}@example.com`
  const dm2Email = `ws-pres2-${Date.now()}@example.com`
  let dm1Token = ''
  let dm1Cookie = ''
  let dm1Csrf = ''
  let dm2Token = ''
  let dm2Cookie = ''
  let dm2Csrf = ''
  let campaignId = ''

  beforeAll(async () => {
    // Register DM1
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'WS Pres1', email: dm1Email, password: 'password123' },
    })
    const login1 = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dm1Email, password: 'password123' },
    })
    dm1Token =
      (login1.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1] ||
      ''
    dm1Cookie = `better-auth.session_token=${dm1Token}`
    dm1Csrf = await getCsrfToken(dm1Cookie)

    // Create campaign
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dm1Cookie, dm1Csrf),
      body: { name: `WS Pres ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Register DM2
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'WS Pres2', email: dm2Email, password: 'password123' },
    })
    const login2 = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dm2Email, password: 'password123' },
    })
    dm2Token =
      (login2.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1] ||
      ''
    dm2Cookie = `better-auth.session_token=${dm2Token}`
    dm2Csrf = await getCsrfToken(dm2Cookie)

    // Invite DM2 to campaign via invite/join flow
    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: withCsrf(dm1Cookie, dm1Csrf),
      body: { role: 'editor' },
    })
    const { token: inviteToken } = await invite.json()

    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(dm2Cookie, dm2Csrf),
      body: { token: inviteToken },
    })
  })

  it('two users connect and both appear in presence list', async () => {
    const ws1Token = await getWsToken(dm1Token)
    const conn1 = await connectCampaignWs(ws1Token, campaignId)
    expect(conn1.connected).toBe(true)

    const ws2Token = await getWsToken(dm2Token)
    const conn2 = await connectCampaignWs(ws2Token, campaignId)
    expect(conn2.connected).toBe(true)

    // Request fresh presence list from conn2
    conn2.ws.send(JSON.stringify({ type: 'presence:list' }))
    await new Promise((resolve) => setTimeout(resolve, 300))

    const presenceMsg = conn2.messages.filter((m) => m.type === 'presence:list').pop()
    expect(presenceMsg).toBeDefined()
    const presenceUsers = (presenceMsg as Record<string, unknown>).users as unknown[]
    expect(presenceUsers.length).toBeGreaterThanOrEqual(2)

    conn1.ws.close()
    conn2.ws.close()
  })
})

describe('Hocuspocus Session/Quest Document Auth (integration)', () => {
  const dmEmail = `collab-sq-${Date.now()}@example.com`
  let dmToken = '' // raw session token for Hocuspocus
  let dmCookie = '' // full cookie string for HTTP requests
  let dmCsrf = ''
  let campaignId = ''
  let sessionSlug = ''
  let questSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'SQ DM', email: dmEmail, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dmEmail, password: 'password123' },
    })
    dmToken =
      (login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1] || ''
    dmCookie = `better-auth.session_token=${dmToken}`
    dmCsrf = await getCsrfToken(dmCookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: `SQ Collab ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create a session
    const sess = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { title: 'Collab Session', scheduledDate: new Date().toISOString(), status: 'planned' },
    })
    sessionSlug = (await sess.json()).slug

    // Create a quest
    const quest = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: 'Collab Quest', status: 'active' },
    })
    questSlug = (await quest.json()).slug
  })

  it('DM can connect to a session document', async () => {
    const docName = `campaign:${campaignId}:session:${sessionSlug}`
    const { provider, connected } = await connectHocuspocus(docName, dmToken)
    expect(connected).toBe(true)
    provider.destroy()
  })

  it('DM can connect to a quest document', async () => {
    const docName = `campaign:${campaignId}:quest:${questSlug}`
    const { provider, connected } = await connectHocuspocus(docName, dmToken)
    expect(connected).toBe(true)
    provider.destroy()
  })

  it('unknown document type is rejected', async () => {
    const docName = `campaign:${campaignId}:location:some-slug`
    const { provider, connected } = await connectHocuspocus(docName, dmToken)
    expect(connected).toBe(false)
    provider.destroy()
  })
})
