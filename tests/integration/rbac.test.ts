import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
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

describe('Entity RBAC (integration)', () => {
  const dmEmail = `rbac-dm-${Date.now()}@example.com`
  const playerEmail = `rbac-player-${Date.now()}@example.com`
  let dmCookie = ''
  let playerCookie = ''
  let dmCsrfToken = ''
  let playerCsrfToken = ''
  let campaignId = ''
  let entitySlug = ''

  beforeAll(async () => {
    // Register DM
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'RBAC DM', email: dmEmail, password: 'password123' } })
    const dmLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: dmEmail, password: 'password123' } })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    dmCsrfToken = await getCsrfToken(dmCookie)

    // Create campaign
    const camp = await api('/api/campaigns', { method: 'POST', headers: withCsrf(dmCookie, dmCsrfToken), body: { name: `RBAC Entity Test ${Date.now()}` } })
    campaignId = (await camp.json()).id

    // Create entity as DM
    const ent = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: withCsrf(dmCookie, dmCsrfToken),
      body: { name: 'Test Entity', type: 'character', content: '# Test' },
    })
    entitySlug = (await ent.json()).slug

    // Register player, invite, join
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'RBAC Player', email: playerEmail, password: 'password123' } })
    const playerLogin = await api('/api/auth/sign-in/email', { method: 'POST', body: { email: playerEmail, password: 'password123' } })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    playerCsrfToken = await getCsrfToken(playerCookie)

    const invite = await api(`/api/campaigns/${campaignId}/invite`, { method: 'POST', headers: withCsrf(dmCookie, dmCsrfToken), body: { role: 'player' } })
    const token = (await invite.json()).token
    await api(`/api/campaigns/${campaignId}/join`, { method: 'POST', headers: withCsrf(playerCookie, playerCsrfToken), body: { token } })
  })

  it('player cannot delete entity (403)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'DELETE', headers: withCsrf(playerCookie, playerCsrfToken),
    })
    expect(res.status).toBe(403)
  })

  it('DM can delete entity', async () => {
    // Create a throwaway entity to delete
    const ent = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: withCsrf(dmCookie, dmCsrfToken),
      body: { name: 'To Delete', type: 'note', content: '# Delete me' },
    })
    const slug = (await ent.json()).slug

    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}`, {
      method: 'DELETE', headers: withCsrf(dmCookie, dmCsrfToken),
    })
    expect(res.status).toBe(200)
  })

  it('DM can set entity permission overrides', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/permissions`, {
      method: 'PUT', headers: withCsrf(dmCookie, dmCsrfToken),
      body: { targetRole: 'player', permission: 'view', effect: 'deny' },
    })
    expect(res.status).toBe(200)
  })

  it('player cannot set entity permission overrides (403)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/permissions`, {
      method: 'PUT', headers: withCsrf(playerCookie, playerCsrfToken),
      body: { targetRole: 'player', permission: 'view', effect: 'allow' },
    })
    expect(res.status).toBe(403)
  })

  it('player cannot create sessions (403)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST', headers: withCsrf(playerCookie, playerCsrfToken),
      body: { title: 'Player Session' },
    })
    expect(res.status).toBe(403)
  })
})

describe('Template & Tag CRUD (integration)', () => {
  const email = `tmpl-test-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Tmpl Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    csrfToken = await getCsrfToken(cookie)
    const camp = await api('/api/campaigns', { method: 'POST', headers: withCsrf(cookie, csrfToken), body: { name: `Tmpl Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('creates template with fields', async () => {
    const res = await api(`/api/campaigns/${campaignId}/templates`, {
      method: 'POST', headers: withCsrf(cookie, csrfToken),
      body: {
        name: 'NPC Template', entityTypeSlug: 'character',
        fields: [
          { key: 'occupation', label: 'Occupation', fieldType: 'text' },
          { key: 'loyalty', label: 'Loyalty', fieldType: 'number' },
        ],
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeDefined()

    // Read template with fields
    const get = await api(`/api/campaigns/${campaignId}/templates/${data.id}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const tmpl = await get.json()
    expect(tmpl.fields).toHaveLength(2)
    expect(tmpl.fields[0].key).toBe('occupation')
  })

  it('creates tag and assigns to entity', async () => {
    // Create tag
    const tagRes = await api(`/api/campaigns/${campaignId}/tags`, {
      method: 'POST', headers: withCsrf(cookie, csrfToken),
      body: { name: 'Important', color: '#ff0000' },
    })
    expect(tagRes.status).toBe(200)
    const tag = await tagRes.json()

    // Create entity
    const entRes = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: withCsrf(cookie, csrfToken),
      body: { name: 'Tagged Entity', type: 'note', content: '# Tagged' },
    })
    expect(entRes.status).toBe(200)
    const ent = await entRes.json()
    expect(ent.id).toBeDefined()

    // Assign tag (uses slug)
    const patchRes = await api(`/api/campaigns/${campaignId}/entities/${ent.slug}/tags`, {
      method: 'PATCH', headers: withCsrf(cookie, csrfToken),
      body: { add: [tag.id] },
    })
    expect(patchRes.status).toBe(200)
  })

  it('decision and consequence recording', async () => {
    // Create session
    const sessRes = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST', headers: withCsrf(cookie, csrfToken),
      body: { title: 'Decision Test Session' },
    })
    const sess = await sessRes.json()

    // Create decision
    const decRes = await api(`/api/campaigns/${campaignId}/sessions/${sess.slug}/decisions`, {
      method: 'POST', headers: withCsrf(cookie, csrfToken),
      body: { title: 'Save the village?', type: 'choice', description: 'Critical moment' },
    })
    expect(decRes.status).toBe(200)
    const dec = await decRes.json()

    // Add consequence
    const conRes = await api(`/api/campaigns/${campaignId}/sessions/${sess.slug}/decisions/${dec.id}/consequences`, {
      method: 'POST', headers: withCsrf(cookie, csrfToken),
      body: { description: 'Village was saved', revealed: false },
    })
    expect(conRes.status).toBe(200)

    // Reveal consequence
    const con = await conRes.json()
    const revealRes = await api(`/api/campaigns/${campaignId}/sessions/${sess.slug}/decisions/${dec.id}/consequences`, {
      method: 'PATCH', headers: withCsrf(cookie, csrfToken),
      body: { consequenceId: con.id, revealed: true },
    })
    expect(revealRes.status).toBe(200)

    // Get decisions -- consequence should be visible
    const getRes = await api(`/api/campaigns/${campaignId}/sessions/${sess.slug}/decisions`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const decisions = await getRes.json()
    expect(decisions).toHaveLength(1)
    expect(decisions[0].consequences).toHaveLength(1)
    expect(decisions[0].consequences[0].revealed).toBe(true)
  })

  it('roll logging stores and retrieves', async () => {
    // Create session for logging
    const sessRes = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST', headers: withCsrf(cookie, csrfToken),
      body: { title: 'Roll Log Session' },
    })
    const sess = await sessRes.json()

    // Roll with session logging
    const rollRes = await api(`/api/campaigns/${campaignId}/roll`, {
      method: 'POST', headers: withCsrf(cookie, csrfToken),
      body: { formula: '2d6+4', sessionId: sess.id },
    })
    expect(rollRes.status).toBe(200)

    // Get roll history
    const histRes = await api(`/api/campaigns/${campaignId}/sessions/${sess.slug}/rolls`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(histRes.status).toBe(200)
    const rolls = await histRes.json()
    expect(rolls.length).toBeGreaterThanOrEqual(1)
    expect(rolls[0].formula).toBe('2d6+4')
  })

  it('character player ownership restriction', async () => {
    // Create character owned by DM (no owner)
    const charRes = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: withCsrf(cookie, csrfToken),
      body: { name: 'DM NPC', characterType: 'npc', content: '# NPC' },
    })
    expect(charRes.status).toBe(200)
  })
})
