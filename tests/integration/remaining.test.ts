import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Hierarchical Nesting', () => {
  const email = `nest-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let parentSlug = ''
  let parentId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Nester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Nest Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('create parent and child entities', async () => {
    const parent = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Barovia Region', type: 'location', content: '# Barovia', parentId: null },
    })
    const parentData = await parent.json()
    parentSlug = parentData.slug
    parentId = parentData.id

    const child = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Village of Barovia', type: 'location', content: '# Village', parentId },
    })
    expect(child.status).toBe(200)
  })

  it('list with parent_id filter returns children', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities?parent_id=${parentId}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.entities.length).toBeGreaterThanOrEqual(1)
    expect(data.entities[0].name).toBe('Village of Barovia')
  })
})

describe('Transaction Immutability', () => {
  const email = `immut-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let txId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Immutable', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Immut Test ${Date.now()}` } })
    campaignId = (await camp.json()).id

    const tx = await api(`/api/campaigns/${campaignId}/transactions`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { type: 'loot', toEntityId: 'player-1', notes: 'Found gold' },
    })
    txId = (await tx.json()).id
  })

  it('PUT on transaction returns 405', async () => {
    const res = await api(`/api/campaigns/${campaignId}/transactions/${txId}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { notes: 'hacked' },
    })
    expect(res.status).toBe(405)
  })

  it('DELETE on transaction returns 405', async () => {
    const res = await api(`/api/campaigns/${campaignId}/transactions/${txId}`, {
      method: 'DELETE', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(405)
  })
})

describe('Calendar Event Filtering', () => {
  const email = `calfilt-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let calendarId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'CalFilter', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `CalFilt ${Date.now()}` } })
    campaignId = (await camp.json()).id

    const cal = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Test Cal', months: [{ name: 'M1', days: 30 }], yearLength: 30 },
    })
    calendarId = (await cal.json()).id

    // Add events in different years
    await api(`/api/campaigns/${campaignId}/calendars/${calendarId}/events`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Event Year 1', date: { year: 1300, month: 1, day: 1 } },
    })
    await api(`/api/campaigns/${campaignId}/calendars/${calendarId}/events`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Event Year 2', date: { year: 1500, month: 1, day: 15 } },
    })
  })

  it('filter events by year range', async () => {
    const res = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}/events?from_year=1400&to_year=1600`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('Event Year 2')
  })

  it('all events returned without filter', async () => {
    const res = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}/events`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data).toHaveLength(2)
  })
})

describe('Calendar Update', () => {
  const email = `calup-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let calendarId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'CalUpdater', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `CalUp ${Date.now()}` } })
    campaignId = (await camp.json()).id

    const cal = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Updatable Cal', months: [{ name: 'Old Month', days: 30 }], yearLength: 30 },
    })
    calendarId = (await cal.json()).id
  })

  it('PUT updates calendar name and months', async () => {
    const res = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { name: 'Renamed Calendar', months: [{ name: 'New Month', days: 31 }] },
    })
    expect(res.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.name).toBe('Renamed Calendar')
    expect(data.config.months[0].name).toBe('New Month')
  })
})
