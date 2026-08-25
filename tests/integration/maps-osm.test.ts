import { describe, it, expect, beforeAll } from 'vitest'
import { unzipSync } from 'fflate'
import { signUpAndLogin, apiRaw } from './helpers'

// Local to this file rather than reusing campaign-export.test.ts's own copy, so this suite
// doesn't need to coordinate edits to a file another change may also be touching.
async function fetchExportCampaignJson(path: string, headers: Record<string, string>) {
  const res = await apiRaw(path, { headers })
  const buf = Buffer.from(await res.arrayBuffer())
  const unzipped = unzipSync(new Uint8Array(buf))
  return JSON.parse(Buffer.from(unzipped['campaign.json']!).toString('utf8'))
}

describe('OSM maps (integration)', () => {
  const ts = Date.now()
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  beforeAll(async () => {
    ;({ cookie, csrfToken } = await signUpAndLogin(
      `osm-maps-${ts}@example.com`,
      'password123',
      'OSM Map Tester',
    ))
    const camp = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `OSM Maps Test ${ts}` },
    })
    campaignId = (await camp.json()).id
  })

  it('creating a map without an explicit type persists as image (task 1.3 non-regression)', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `Untyped Map ${ts}` },
    })
    expect(res.status).toBe(200)
    const created = await res.json()

    const getRes = await apiRaw(`/api/campaigns/${campaignId}/maps/${created.slug}`, {
      headers: { Cookie: cookie },
    })
    const map = await getRes.json()
    expect(map.type).toBe('image')
    expect(map.centerLat).toBeNull()
    expect(map.centerLng).toBeNull()
    expect(map.defaultZoom).toBeNull()
  })

  it('creating an osm map with direct coordinates persists center/zoom without geocoding (task 3.3)', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: {
        name: `Berlin Direct ${ts}`,
        type: 'osm',
        centerLat: 52.52,
        centerLng: 13.405,
        defaultZoom: 12,
      },
    })
    expect(res.status).toBe(200)
    const created = await res.json()

    const getRes = await apiRaw(`/api/campaigns/${campaignId}/maps/${created.slug}`, {
      headers: { Cookie: cookie },
    })
    const map = await getRes.json()
    expect(map.type).toBe('osm')
    expect(map.centerLat).toBeCloseTo(52.52)
    expect(map.centerLng).toBeCloseTo(13.405)
    expect(map.defaultZoom).toBe(12)
  })

  it('rejects an out-of-range centerLat/centerLng with 422', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `Bad Coords ${ts}`, type: 'osm', centerLat: 999, centerLng: 13.4 },
    })
    expect(res.status).toBe(422)
  })

  it('PUT can switch an existing map to osm and set its center/zoom', async () => {
    const created = await (
      await apiRaw(`/api/campaigns/${campaignId}/maps`, {
        method: 'POST',
        headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
        body: { name: `To Be Retyped ${ts}` },
      })
    ).json()

    const putRes = await apiRaw(`/api/campaigns/${campaignId}/maps/${created.slug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { type: 'osm', centerLat: 48.8566, centerLng: 2.3522, defaultZoom: 13 },
    })
    expect(putRes.status).toBe(200)

    const map = await (
      await apiRaw(`/api/campaigns/${campaignId}/maps/${created.slug}`, {
        headers: { Cookie: cookie },
      })
    ).json()
    expect(map.type).toBe('osm')
    expect(map.centerLat).toBeCloseTo(48.8566)
    expect(map.centerLng).toBeCloseTo(2.3522)
    expect(map.defaultZoom).toBe(13)
  })

  describe('pin coordinate validation depends on map type (task 5.6)', () => {
    let osmSlug = ''
    let imageSlug = ''

    beforeAll(async () => {
      const osmMap = await (
        await apiRaw(`/api/campaigns/${campaignId}/maps`, {
          method: 'POST',
          headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
          body: { name: `Pin Range OSM ${ts}`, type: 'osm', centerLat: 52.52, centerLng: 13.405 },
        })
      ).json()
      osmSlug = osmMap.slug

      const imageMap = await (
        await apiRaw(`/api/campaigns/${campaignId}/maps`, {
          method: 'POST',
          headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
          body: { name: `Pin Range Image ${ts}` },
        })
      ).json()
      imageSlug = imageMap.slug
    })

    it('rejects an out-of-range lat/lng pin on an osm map with 422', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/maps/${osmSlug}/pins`, {
        method: 'POST',
        headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
        body: { lat: 200, lng: 400, label: 'Out of range' },
      })
      expect(res.status).toBe(422)
    })

    it('accepts an in-range lat/lng pin on an osm map', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/maps/${osmSlug}/pins`, {
        method: 'POST',
        headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
        body: { lat: 52.5, lng: 13.4, label: 'Alexanderplatz' },
      })
      expect(res.status).toBe(200)
    })

    it('accepts a large pixel-scale lat/lng pin on an image map (non-regression)', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/maps/${imageSlug}/pins`, {
        method: 'POST',
        headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
        body: { lat: 4000, lng: 8000, label: 'Far pixel corner' },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('geocode endpoint (task 2.5)', () => {
    let playerCookie = ''

    beforeAll(async () => {
      ;({ cookie: playerCookie } = await signUpAndLogin(
        `osm-maps-player-${ts}@example.com`,
        'password123',
        'OSM Player',
      ))
      // Join as a plain member (default role from invite flow is out of scope here --
      // simplest is to add directly as 'player' via the DM's own campaign).
      await apiRaw(`/api/campaigns/${campaignId}/members/direct`, {
        method: 'POST',
        headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
        body: { userId: await extractUserId(playerCookie), role: 'player' },
      })
    })

    async function extractUserId(sessionCookie: string): Promise<string> {
      const res = await apiRaw('/api/auth/get-session', { headers: { Cookie: sessionCookie } })
      const data = (await res.json()) as { user?: { id?: string } }
      return data.user?.id || ''
    }

    it('returns 403 for a player (below editor) role', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/maps/geocode`, {
        method: 'POST',
        headers: { Cookie: playerCookie },
        body: { query: 'Berlin' },
      })
      expect(res.status).toBe(403)
    })

    it('returns 422 for a missing query', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/maps/geocode`, {
        method: 'POST',
        headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
        body: {},
      })
      expect(res.status).toBe(422)
    })
  })

  describe('campaign export includes the new columns (task 7.4, design.md D7)', () => {
    it('GET /export carries type/centerLat/centerLng/defaultZoom for an osm map', async () => {
      const created = await (
        await apiRaw(`/api/campaigns/${campaignId}/maps`, {
          method: 'POST',
          headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
          body: {
            name: `Export OSM Map ${ts}`,
            type: 'osm',
            centerLat: 52.52,
            centerLng: 13.405,
            defaultZoom: 12,
          },
        })
      ).json()

      const campaignJson = await fetchExportCampaignJson(`/api/campaigns/${campaignId}/export`, {
        Cookie: cookie,
      })

      expect(campaignJson.maps).toBeDefined()
      const exportedMap = campaignJson.maps.find(
        (m: Record<string, unknown>) => m.id === created.id,
      )
      expect(exportedMap).toBeDefined()
      expect(exportedMap.type).toBe('osm')
      expect(exportedMap.centerLat).toBeCloseTo(52.52)
      expect(exportedMap.centerLng).toBeCloseTo(13.405)
      expect(exportedMap.defaultZoom).toBe(12)
    })
  })
})
