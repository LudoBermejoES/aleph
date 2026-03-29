import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Character list filters and meta (integration)', () => {
  const email = `char-filters-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let elfSlug = ''
  let humanSlug = ''
  let orgId = ''

  beforeAll(async () => {
    // Auth
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Filter Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''

    // Campaign
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Filter Test ${Date.now()}` } })
    campaignId = (await camp.json()).id

    // Create characters with varied fields
    const elf = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Legolas', characterType: 'pc', race: 'Elf', class: 'Ranger', alignment: 'Neutral Good', status: 'alive' },
    })
    elfSlug = (await elf.json()).slug

    const human = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Boromir', characterType: 'pc', race: 'Human', class: 'Fighter', alignment: 'Lawful Good', status: 'dead' },
    })
    humanSlug = (await human.json()).slug

    await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Gandalf', characterType: 'npc', race: 'Maiar', class: 'Wizard', alignment: 'Neutral Good', status: 'alive' },
    })

    // Create companion
    const legolasData = await (await api(`/api/campaigns/${campaignId}/characters/${elfSlug}`, { headers: { Cookie: cookie } })).json()
    await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Arod', characterType: 'npc', race: 'Horse', isCompanionOf: legolasData.id },
    })

    // Create organization and add Legolas
    const org = await api(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'The Fellowship', type: 'faction' },
    })
    orgId = (await org.json()).id
    const legolas = await (await api(`/api/campaigns/${campaignId}/characters/${elfSlug}`, { headers: { Cookie: cookie } })).json()
    await api(`/api/campaigns/${campaignId}/organizations/the-fellowship/members`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { characterId: legolas.id, role: 'Scout' },
    })
  })

  // 8.1 race filter
  it('GET ?race=Elf returns only Elf characters', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?race=Elf`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((c: any) => c.race === 'Elf')).toBe(true)
  })

  // 8.2 class filter
  it('GET ?class=Wizard returns only Wizard characters', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?class=Wizard`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((c: any) => c.class === 'Wizard')).toBe(true)
  })

  // 8.3 alignment filter
  it('GET ?alignment=Neutral+Good returns only matching characters', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?alignment=Neutral+Good`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((c: any) => c.alignment === 'Neutral Good')).toBe(true)
  })

  // 8.4 status filter
  it('GET ?status=dead returns only dead characters', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?status=dead`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThan(0)
    expect(data.every((c: any) => c.status === 'dead')).toBe(true)
  })

  // 8.5 organizationId filter
  it('GET ?organizationId=<id> returns only org members', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?organizationId=${orgId}`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThan(0)
    // Only Legolas is in the org
    expect(data.some((c: any) => c.name === 'Legolas')).toBe(true)
    expect(data.every((c: any) => c.name !== 'Boromir')).toBe(true)
  })

  // 8.6 sort by name asc
  it('GET ?sort=name&sortDir=asc returns alphabetical order', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?sort=name&sortDir=asc`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    const names = data.map((c: any) => c.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })

  // 8.7 unknown sort field falls back to updatedAt desc
  it('GET ?sort=invalid falls back gracefully', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?sort=invalid`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  // 8.8 response includes locationName and primaryOrg fields
  it('GET /characters response includes locationName and primaryOrg fields', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThan(0)
    // All rows have these keys (may be null)
    for (const c of data) {
      expect(Object.prototype.hasOwnProperty.call(c, 'locationName')).toBe(true)
      expect(Object.prototype.hasOwnProperty.call(c, 'primaryOrg')).toBe(true)
    }
    // Legolas should have a primaryOrg
    const legolas = data.find((c: any) => c.name === 'Legolas')
    expect(legolas).toBeDefined()
    expect(legolas.primaryOrg).not.toBeNull()
    expect(legolas.primaryOrg.name).toBe('The Fellowship')
    expect(legolas.primaryOrg.role).toBe('Scout')
  })

  // 8.9 meta returns distinct values
  it('GET /characters/meta returns distinct races, classes, alignments', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/meta`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.races).toContain('Elf')
    expect(data.races).toContain('Human')
    expect(data.classes).toContain('Wizard')
    expect(data.classes).toContain('Ranger')
    expect(data.alignments).toContain('Neutral Good')
    // No duplicates
    expect(data.races.length).toBe(new Set(data.races).size)
  })

  // 8.10 meta requires auth
  it('GET /characters/meta returns 401 without session', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/meta`)
    expect(res.status).toBe(401)
  })

  // companions filter
  it('GET ?companions=false excludes companion characters', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?companions=false`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.every((c: any) => c.isCompanionOf === null)).toBe(true)
  })
})
