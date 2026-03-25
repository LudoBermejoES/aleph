import { describe, it, expect, beforeAll } from 'vitest'
import { WebSocket } from 'ws'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3334'

// Check if Hocuspocus is running before WebSocket tests
async function isHocuspocusRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL)
    const timeout = setTimeout(() => { ws.close(); resolve(false) }, 2000)
    ws.on('open', () => { clearTimeout(timeout); ws.close(); resolve(true) })
    ws.on('error', () => { clearTimeout(timeout); resolve(false) })
  })
}

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

function connectHocuspocus(documentName: string, token: string): Promise<{ ws: WebSocket; connected: boolean; error?: string }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}/${documentName}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const timeout = setTimeout(() => {
      ws.close()
      resolve({ ws, connected: false, error: 'timeout' })
    }, 5000)

    ws.on('open', () => {
      clearTimeout(timeout)
      resolve({ ws, connected: true })
    })

    ws.on('error', (err: Error) => {
      clearTimeout(timeout)
      resolve({ ws, connected: false, error: err.message })
    })

    ws.on('close', (code: number) => {
      clearTimeout(timeout)
      if (code !== 1000) {
        resolve({ ws, connected: false, error: `closed with code ${code}` })
      }
    })
  })
}

// Hocuspocus tests require the collaboration server on port 3334.
// Skip entire suite if Hocuspocus is not running (e.g. dev server needs restart).
const hocuspocusAvailable = await isHocuspocusRunning()

describe.skipIf(!hocuspocusAvailable)('Hocuspocus Authentication (integration)', () => {
  const dmEmail = `collab-dm-${Date.now()}@example.com`
  const playerEmail = `collab-player-${Date.now()}@example.com`
  let dmCookie = ''
  let playerCookie = ''
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
    dmCookie = (dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1] || ''

    // Create campaign
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: `better-auth.session_token=${dmCookie}` },
      body: { name: `Collab Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create an entity to collaborate on
    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { Cookie: `better-auth.session_token=${dmCookie}` },
      body: { name: 'Collab Test Entity', type: 'character', content: '# Test Entity\n\nSome content.' },
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
    playerCookie = (playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1] || ''

    // Add player to campaign as 'player' role (not editor)
    await api(`/api/campaigns/${campaignId}/members`, {
      method: 'POST',
      headers: { Cookie: `better-auth.session_token=${dmCookie}` },
      body: { email: playerEmail, role: 'player' },
    })
  })

  it('DM (editor+ role) can connect to Hocuspocus', async () => {
    const docName = `campaign:${campaignId}:entity:${entitySlug}`
    const { ws, connected } = await connectHocuspocus(docName, dmCookie)
    expect(connected).toBe(true)
    ws.close()
  })

  it('player role is rejected by Hocuspocus (insufficient permissions)', async () => {
    const docName = `campaign:${campaignId}:entity:${entitySlug}`
    const { ws, connected } = await connectHocuspocus(docName, playerCookie)
    expect(connected).toBe(false)
    ws.close()
  })

  it('invalid token is rejected by Hocuspocus', async () => {
    const docName = `campaign:${campaignId}:entity:${entitySlug}`
    const { ws, connected } = await connectHocuspocus(docName, 'invalid-token-xxx')
    expect(connected).toBe(false)
    ws.close()
  })

  it('invalid document name format is rejected', async () => {
    const { ws, connected } = await connectHocuspocus('bad-format', dmCookie)
    expect(connected).toBe(false)
    ws.close()
  })

  it('non-member cannot connect', async () => {
    // Register a completely separate user who is not a member of the campaign
    const outsiderEmail = `outsider-${Date.now()}@example.com`
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Outsider', email: outsiderEmail, password: 'password123' },
    })
    const outsiderLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: outsiderEmail, password: 'password123' },
    })
    const outsiderCookie = (outsiderLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1] || ''

    const docName = `campaign:${campaignId}:entity:${entitySlug}`
    const { ws, connected } = await connectHocuspocus(docName, outsiderCookie)
    expect(connected).toBe(false)
    ws.close()
  })
})

describe('Save Pipeline (integration)', () => {
  const email = `save-pipe-${Date.now()}@example.com`
  let cookie = ''
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

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { name: `SavePipe ${Date.now()}` },
    })
    campaignId = (await camp.json()).id
  })

  it('entity content is persisted after creation and retrievable', async () => {
    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { name: 'Save Test NPC', type: 'character', content: '# Save Test NPC\n\nOriginal content.' },
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
      headers: { Cookie: cookie },
      body: { name: 'Hash Test NPC', type: 'character', content: '# Hash Test\n\nContent for hash.' },
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
      headers: { Cookie: cookie },
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
      headers: { Cookie: cookie },
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
      headers: { Cookie: cookie },
      body: { name: 'FTS Reindex NPC', type: 'character', content: '# FTS Test\n\nGeneric content.' },
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
      headers: { Cookie: cookie },
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
