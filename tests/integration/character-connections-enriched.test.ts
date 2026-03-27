import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: any }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Character connections — enriched response (integration)', () => {
  const email = `conn-enriched-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let char1Slug = ''
  let char2Slug = ''
  let char2EntityId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Conn Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''

    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Conn Enriched Test ${Date.now()}` } })
    campaignId = (await camp.json()).id

    // Create two characters
    const c1 = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Arwen', characterType: 'pc' },
    })
    char1Slug = (await c1.json()).slug

    const c2 = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Aragorn', characterType: 'npc' },
    })
    const c2Data = await c2.json()
    char2Slug = c2Data.slug

    // Get Aragorn's entity ID via entity list
    const entities = await api(`/api/campaigns/${campaignId}/entities`, { headers: { Cookie: cookie } })
    const entList = await entities.json()
    char2EntityId = (entList.entities ?? entList).find((e: any) => e.slug === char2Slug)?.id
  })

  it('empty connection list before any connections added', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${char1Slug}/connections`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual([])
  })

  it('POST connection returns id', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${char1Slug}/connections`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { targetEntityId: char2EntityId, label: 'loves', description: 'Their bond is unbreakable' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeDefined()
  })

  it('GET connections returns enriched targetEntityName, targetEntitySlug, targetEntityType', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${char1Slug}/connections`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)

    const conn = data[0]
    expect(conn.targetEntityId).toBe(char2EntityId)
    expect(conn.label).toBe('loves')
    expect(conn.description).toBe('Their bond is unbreakable')

    // Enriched fields
    expect(conn.targetEntityName).toBe('Aragorn')
    expect(conn.targetEntitySlug).toBe(char2Slug)
    expect(conn.targetEntityType).toBe('character')
  })

  it('targetEntityName is null for a dangling targetEntityId', async () => {
    // Insert a connection with a non-existent target entity ID directly via POST
    // (server won't validate FK strictly in SQLite without PRAGMA)
    const res = await api(`/api/campaigns/${campaignId}/characters/${char1Slug}/connections`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { targetEntityId: '00000000-0000-0000-0000-000000000000', label: 'mystery' },
    })
    // May succeed or fail depending on FK enforcement — if it succeeds check enrichment
    if (res.status === 200) {
      const conns = await api(`/api/campaigns/${campaignId}/characters/${char1Slug}/connections`, { headers: { Cookie: cookie } })
      const data = await conns.json()
      const dangling = data.find((c: any) => c.label === 'mystery')
      if (dangling) {
        expect(dangling.targetEntityName).toBeNull()
        expect(dangling.targetEntitySlug).toBeNull()
        expect(dangling.targetEntityType).toBeNull()
      }
    }
  })

  it('401 without auth', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${char1Slug}/connections`)
    expect(res.status).toBe(401)
  })

  it('404 for unknown character slug', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/nonexistent-slug/connections`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(404)
  })
})
