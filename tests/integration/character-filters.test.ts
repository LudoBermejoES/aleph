import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Character list filters (integration)', () => {
  const email = `char-filters-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let elfSlug = ''
  let _humanSlug = ''
  let orgId = ''

  beforeAll(async () => {
    // Auth
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Filter Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
    const campList = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
    const setCookie = campList.headers.get('set-cookie') || ''
    csrfToken = setCookie.match(/csrf_token=([^;]+)/)?.[1] || ''
    cookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie

    // Campaign
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `Filter Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create characters with varied fields
    const elf = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: {
        name: 'Legolas',
        characterType: 'pc',
        status: 'alive',
      },
    })
    elfSlug = (await elf.json()).slug

    const human = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: {
        name: 'Boromir',
        characterType: 'pc',
        status: 'dead',
      },
    })
    _humanSlug = (await human.json()).slug

    await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: {
        name: 'Gandalf',
        characterType: 'npc',
        status: 'alive',
      },
    })

    // Create companion
    const legolasData = await (
      await api(`/api/campaigns/${campaignId}/characters/${elfSlug}`, {
        headers: { Cookie: cookie },
      })
    ).json()
    await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'Arod', characterType: 'npc', isCompanionOf: legolasData.id },
    })

    // Create organization and add Legolas
    const org = await api(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'The Fellowship', type: 'faction' },
    })
    orgId = (await org.json()).id
    const legolas = await (
      await api(`/api/campaigns/${campaignId}/characters/${elfSlug}`, {
        headers: { Cookie: cookie },
      })
    ).json()
    await api(`/api/campaigns/${campaignId}/organizations/the-fellowship/members`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { characterId: legolas.id, role: 'Scout' },
    })
  })

  it('GET ?status=dead returns only dead characters', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?status=dead`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((c: Record<string, unknown>) => c.status === 'dead')).toBe(true)
  })

  it('GET ?organizationId=<id> returns only org members', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?organizationId=${orgId}`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    expect(data.length).toBeGreaterThan(0)
    // Only Legolas is in the org
    expect(data.some((c: Record<string, unknown>) => c.name === 'Legolas')).toBe(true)
    expect(data.every((c: Record<string, unknown>) => c.name !== 'Boromir')).toBe(true)
  })

  it('GET ?sort=name&sortDir=asc returns alphabetical order', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?sort=name&sortDir=asc`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    const names = data.map((c: Record<string, unknown>) => c.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })

  it('GET ?sort=invalid falls back gracefully', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?sort=invalid`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    expect(Array.isArray(data)).toBe(true)
  })

  it('GET /characters response includes locationName and primaryOrg fields', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    expect(data.length).toBeGreaterThan(0)
    // All rows have these keys (may be null)
    for (const c of data) {
      expect(Object.prototype.hasOwnProperty.call(c, 'locationName')).toBe(true)
      expect(Object.prototype.hasOwnProperty.call(c, 'primaryOrg')).toBe(true)
    }
    // Legolas should have a primaryOrg
    const legolas = data.find((c: Record<string, unknown>) => c.name === 'Legolas')
    expect(legolas).toBeDefined()
    expect(legolas.primaryOrg).not.toBeNull()
    expect(legolas.primaryOrg.name).toBe('The Fellowship')
    expect(legolas.primaryOrg.role).toBe('Scout')
  })

  it('GET ?companions=false excludes companion characters', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?companions=false`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    expect(data.every((c: Record<string, unknown>) => c.isCompanionOf === null)).toBe(true)
  })
})
