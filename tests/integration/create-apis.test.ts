import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Character create with all fields (9.19)', () => {
  const email = `create-char-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'CreateChar', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `CreateChar ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('returns all fields in response', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        name: 'Full Character',
        characterType: 'npc',
        race: 'Vampire',
        class: 'Necromancer',
        alignment: 'Lawful Evil',
        status: 'alive',
        visibility: 'dm_only',
        content: '# Full Character\n\nWith all fields.',
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slug).toBeDefined()
    expect(data.name).toBe('Full Character')
    expect(data.characterType).toBe('npc')

    // Verify GET returns the data correctly
    const get = await api(`/api/campaigns/${campaignId}/characters/${data.slug}`, { headers: { Cookie: cookie } })
    const char = await get.json()
    expect(char.race).toBe('Vampire')
    expect(char.class).toBe('Necromancer')
    expect(char.alignment).toBe('Lawful Evil')
    expect(char.status).toBe('alive')
    expect(char.content).toContain('With all fields.')
  })
})

describe('Calendar create with configJson (9.20)', () => {
  const email = `create-cal-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'CreateCal', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `CreateCal ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('returns correct nested structure', async () => {
    const res = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        name: 'Harptos',
        configJson: JSON.stringify({
          months: [{ name: 'Hammer', days: 30 }, { name: 'Alturiak', days: 30 }],
          yearLength: 60,
          weekdays: ['Sol', 'Lun', 'Mar', 'Mer', 'Yov', 'Fri', 'Sat'],
        }),
        currentYear: 1492, currentMonth: 1, currentDay: 15,
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeDefined()

    // Verify GET returns nested structure
    const get = await api(`/api/campaigns/${campaignId}/calendars/${data.id}`, { headers: { Cookie: cookie } })
    const cal = await get.json()
    expect(cal.name).toBe('Harptos')
    expect(cal.config.months).toHaveLength(2)
    expect(cal.config.months[0].name).toBe('Hammer')
    expect(cal.config.weekdays).toHaveLength(7)
    expect(cal.currentDate.year).toBe(1492)
    expect(cal.currentDate.month).toBe(1)
    expect(cal.currentDate.day).toBe(15)
  })
})

describe('Relation create validates entities (9.21)', () => {
  const email = `create-rel-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let entity1Id = ''
  let entity2Id = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'CreateRel', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `CreateRel ${Date.now()}` } })
    campaignId = (await camp.json()).id

    const e1 = await api(`/api/campaigns/${campaignId}/entities`, { method: 'POST', headers: { Cookie: cookie }, body: { name: 'Source', type: 'character', content: '# S' } })
    entity1Id = (await e1.json()).id
    const e2 = await api(`/api/campaigns/${campaignId}/entities`, { method: 'POST', headers: { Cookie: cookie }, body: { name: 'Target', type: 'location', content: '# T' } })
    entity2Id = (await e2.json()).id
  })

  it('rejects non-existent source entity', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { sourceEntityId: 'nonexistent-id', targetEntityId: entity2Id, forwardLabel: 'test' },
    })
    expect(res.status).toBe(404)
  })

  it('rejects non-existent target entity', async () => {
    const res = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { sourceEntityId: entity1Id, targetEntityId: 'nonexistent-id', forwardLabel: 'test' },
    })
    expect(res.status).toBe(404)
  })

  it('succeeds with valid entities', async () => {
    // Need a relation type (required NOT NULL)
    const types = await api(`/api/campaigns/${campaignId}/relation-types`, { headers: { Cookie: cookie } })
    const typeList = await types.json()
    const typeId = typeList[0]?.id

    const res = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        sourceEntityId: entity1Id,
        targetEntityId: entity2Id,
        relationTypeId: typeId,
        forwardLabel: 'rules over',
        reverseLabel: 'ruled by',
        attitude: 75,
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeDefined()
  })
})
