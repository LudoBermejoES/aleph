import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Calendar & Timeline (integration)', () => {
  const email = `cal-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let calendarId = ''
  let timelineSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Cal Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Cal Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('POST creates calendar with months, moons, seasons', async () => {
    const res = await api(`/api/campaigns/${campaignId}/calendars`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        name: 'Harptos Calendar',
        months: [
          { name: 'Hammer', days: 30 }, { name: 'Alturiak', days: 30 },
          { name: 'Ches', days: 30 }, { name: 'Tarsakh', days: 30 },
        ],
        weekdays: ['Sune', 'Tempus', 'Tymora', 'Mystra', 'Oghma'],
        yearLength: 120,
        currentDate: { year: 1492, month: 1, day: 1 },
        moons: [{ name: 'Selune', cycleDays: 30, phaseOffset: 0 }],
        seasons: [{ name: 'Spring', startMonth: 2, startDay: 1, endMonth: 3, endDay: 30 }],
      },
    })
    expect(res.status).toBe(200)
    calendarId = (await res.json()).id
  })

  it('GET calendar returns full nested structure', async () => {
    const res = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Harptos Calendar')
    expect(data.config.months).toHaveLength(4)
    expect(data.moons).toHaveLength(1)
    expect(data.seasons).toHaveLength(1)
    expect(data.currentDate.year).toBe(1492)
  })

  it('PATCH advances current date', async () => {
    const res = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}/advance`, {
      method: 'PATCH', headers: { Cookie: cookie },
      body: { days: 35 },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.currentDate.month).toBe(2) // crossed month boundary
    expect(data.currentDate.day).toBe(6) // 30 + 6 = 36 days from day 1
  })

  it('POST calendar event', async () => {
    const res = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}/events`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Festival of Greengrass', date: { year: 1492, month: 3, day: 1 } },
    })
    expect(res.status).toBe(200)
  })

  it('GET calendar includes events', async () => {
    const res = await api(`/api/campaigns/${campaignId}/calendars/${calendarId}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.events.length).toBeGreaterThanOrEqual(1)
    expect(data.events[0].name).toBe('Festival of Greengrass')
  })

  it('POST creates timeline', async () => {
    const res = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'History of the Realms' },
    })
    expect(res.status).toBe(200)
    timelineSlug = (await res.json()).slug
  })

  it('POST timeline event', async () => {
    const res = await api(`/api/campaigns/${campaignId}/timelines/${timelineSlug}/events`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'The Spellplague', date: { year: 1385, month: 1, day: 1 }, era: 'Age of Upheaval' },
    })
    expect(res.status).toBe(200)
  })

  it('GET timelines returns with events', async () => {
    const res = await api(`/api/campaigns/${campaignId}/timelines`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(data[0].events.length).toBeGreaterThanOrEqual(1)
  })
})
