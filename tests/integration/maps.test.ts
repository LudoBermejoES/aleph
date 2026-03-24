import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Map CRUD (integration)', () => {
  const email = `map-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let mapSlug = ''
  let mapId = ''
  let pinId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Map Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Map Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('POST creates map', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'World Map' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slug).toBe('world-map')
    mapSlug = data.slug
    mapId = data.id
  })

  it('GET map returns map with pins, layers, breadcrumb', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('World Map')
    expect(data.pins).toBeDefined()
    expect(data.layers).toBeDefined()
    expect(data.breadcrumb).toBeDefined()
    expect(data.breadcrumb).toHaveLength(1)
  })

  it('POST pin with coordinates', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { label: 'Castle Ravenloft', lat: 100.5, lng: 200.3, color: '#ff0000' },
    })
    expect(res.status).toBe(200)
    pinId = (await res.json()).id
    expect(pinId).toBeDefined()
  })

  it('GET pins returns created pin', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(data.find((p: any) => p.label === 'Castle Ravenloft')).toBeDefined()
  })

  it('POST layer with sort order', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/layers`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Political Borders', type: 'overlay', opacity: 0.5, sortOrder: 1 },
    })
    expect(res.status).toBe(200)
  })

  it('POST region with GeoJSON', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions`, {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        name: 'Barovia',
        geojson: { type: 'Polygon', coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]] },
        color: '#00ff00',
      },
    })
    expect(res.status).toBe(200)
  })

  it('GET regions returns valid GeoJSON', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/regions`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(1)
    const region = data[0]
    const geojson = JSON.parse(region.geojson)
    expect(geojson.type).toBe('Polygon')
  })

  it('nested map breadcrumb works', async () => {
    // Create child map
    const childRes = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Barovia Region', parentMapId: mapId },
    })
    const child = await childRes.json()

    const res = await api(`/api/campaigns/${campaignId}/maps/${child.slug}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.breadcrumb).toHaveLength(2)
    expect(data.breadcrumb[0].name).toBe('World Map')
    expect(data.breadcrumb[1].name).toBe('Barovia Region')
  })

  it('PUT updates map name', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { name: 'Updated World Map' },
    })
    expect(res.status).toBe(200)
  })

  it('DELETE pin', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins/${pinId}`, {
      method: 'DELETE', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
  })

  it('DELETE map', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}`, {
      method: 'DELETE', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
  })
})
