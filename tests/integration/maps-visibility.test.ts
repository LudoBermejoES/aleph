import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function getCsrfToken(sessionCookie: string): Promise<string> {
  const res = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = res.headers.get('set-cookie') || ''
  const match = setCookie.match(/csrf_token=([^;]+)/)
  return match?.[1] || ''
}

function withCsrf(cookie: string, csrfToken: string) {
  return { Cookie: `${cookie}; csrf_token=${csrfToken}`, 'X-CSRF-Token': csrfToken }
}

describe('Map Pin Visibility Filtering (9.17)', () => {
  const dmEmail = `map-dm-${Date.now()}@example.com`
  const playerEmail = `map-player-${Date.now()}@example.com`
  let dmCookie = ''
  let dmCsrf = ''
  let playerCookie = ''
  let playerCsrf = ''
  let campaignId = ''
  let mapSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Map DM', email: dmEmail, password: 'password123' },
    })
    const dmLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dmEmail, password: 'password123' },
    })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    dmCsrf = await getCsrfToken(dmCookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: `Map Vis ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create a map
    const map = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: 'Test Map', width: 1000, height: 1000 },
    })
    mapSlug = (await map.json()).slug

    // Create pins with different visibility
    await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { label: 'Public Tavern', lat: 100, lng: 100, visibility: 'members' },
    })
    await api(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { label: 'Secret Lair', lat: 500, lng: 500, visibility: 'dm_only' },
    })

    // Player setup
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Map Player', email: playerEmail, password: 'password123' },
    })
    const playerLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: playerEmail, password: 'password123' },
    })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    playerCsrf = await getCsrfToken(playerCookie)

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { role: 'player' },
    })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie, playerCsrf),
      body: { token: inviteToken },
    })
  })

  it('DM sees all pins including dm_only', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}`, {
      method: 'GET',
      headers: { Cookie: dmCookie },
    })
    const data = await res.json()
    const labels = data.pins?.map((p: Record<string, unknown>) => p.label) || []
    expect(labels).toContain('Public Tavern')
    expect(labels).toContain('Secret Lair')
  })

  it('player does not see dm_only pins', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}`, {
      method: 'GET',
      headers: { Cookie: playerCookie },
    })
    const data = await res.json()
    const labels = data.pins?.map((p: Record<string, unknown>) => p.label) || []
    expect(labels).toContain('Public Tavern')
    expect(labels).not.toContain('Secret Lair')
  })
})

// enforce-map-visibility: `maps.visibility` was previously never checked by any server route
// (design.md's Context). These exercise every one of the seven read surfaces, the positive path
// (tasks.md 6.2 -- the real risk is in the WIRING, a route resolving with the wrong role, not
// the shared predicate), the map/pin composition (6.3), and the nested-map decision (5.3).
describe('Map-level visibility enforcement (enforce-map-visibility)', () => {
  const dmEmail = `map-vis2-dm-${Date.now()}@example.com`
  const playerEmail = `map-vis2-player-${Date.now()}@example.com`
  let dmCookie = ''
  let dmCsrf = ''
  let playerCookie = ''
  let playerCsrf = ''
  let campaignId = ''
  let visibleSlug = ''
  let hiddenSlug = ''
  let visibleMapId = ''

  // Minimal valid 1x1 PNG, decoded without Node Buffer APIs (same fixture as maps-tiling.test.ts).
  function base64ToUint8Array(b64: string): Uint8Array {
    const binary = atob(b64)
    return new Uint8Array([...binary].map((c) => c.charCodeAt(0)))
  }
  const TINY_PNG = base64ToUint8Array(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  )

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Map Vis2 DM', email: dmEmail, password: 'password123' },
    })
    const dmLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: dmEmail, password: 'password123' },
    })
    dmCookie = `better-auth.session_token=${(dmLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    dmCsrf = await getCsrfToken(dmCookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: `Map Vis2 ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // A default-visibility ('members') map -- visible to a player.
    const visibleMap = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: 'Visible Map', width: 1000, height: 1000 },
    })
    const visibleMapData = await visibleMap.json()
    visibleSlug = visibleMapData.slug
    visibleMapId = visibleMapData.id

    // A dm_only map -- above a player's role.
    const hiddenMap = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: 'Hidden Map', width: 1000, height: 1000, visibility: 'dm_only' },
    })
    hiddenSlug = (await hiddenMap.json()).slug

    // A pin, a layer and a region on the visible map, so 6.1/6.2 exercise real rows, not just
    // an empty collection.
    await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}/pins`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { label: 'Town Square', lat: 10, lng: 10, visibility: 'members' },
    })
    // A dm_only pin on the SAME visible map, for the composition test (6.3 / design D4).
    await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}/pins`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { label: 'War Room', lat: 20, lng: 20, visibility: 'dm_only' },
    })
    await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}/layers`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { name: 'Overlay' },
    })
    await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}/regions`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: {
        name: 'Old Town',
        geojson: JSON.stringify({ type: 'Polygon', coordinates: [] }),
        visibility: 'members',
      },
    })

    // A real uploaded image on the visible map, so the image/tiles positive-path check (6.2)
    // proves the ROUTE'S OWN 200, not merely "not a 404 because no file exists either way".
    const form = new FormData()
    form.append(
      'image',
      new Blob([TINY_PNG.buffer as ArrayBuffer], { type: 'image/png' }),
      'test.png',
    )
    await fetch(`${BASE_URL}/api/campaigns/${campaignId}/maps/${visibleSlug}/upload`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: form,
    })

    // Player setup + join.
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Map Vis2 Player', email: playerEmail, password: 'password123' },
    })
    const playerLogin = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: playerEmail, password: 'password123' },
    })
    playerCookie = `better-auth.session_token=${(playerLogin.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    playerCsrf = await getCsrfToken(playerCookie)

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: { role: 'player' },
    })
    const { token: inviteToken } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie, playerCsrf),
      body: { token: inviteToken },
    })
  })

  // --- 6.1: a role below the threshold gets 404/omission, per surface ---

  it('6.1 listing omits a dm_only map from a player, but includes it for the dm', async () => {
    const asPlayer = await api(`/api/campaigns/${campaignId}/maps`, {
      headers: { Cookie: playerCookie },
    })
    const playerSlugs = (await asPlayer.json()).data.map((m: { slug: string }) => m.slug)
    expect(playerSlugs).toContain(visibleSlug)
    expect(playerSlugs).not.toContain(hiddenSlug)

    const asDm = await api(`/api/campaigns/${campaignId}/maps`, { headers: { Cookie: dmCookie } })
    const dmSlugs = (await asDm.json()).data.map((m: { slug: string }) => m.slug)
    expect(dmSlugs).toContain(hiddenSlug)
  })

  it('6.1 GET /maps/:slug on a hidden map is a 404 for a player, same as an unknown slug (design D2)', async () => {
    const hidden = await api(`/api/campaigns/${campaignId}/maps/${hiddenSlug}`, {
      headers: { Cookie: playerCookie },
    })
    expect(hidden.status).toBe(404)

    const unknown = await api(`/api/campaigns/${campaignId}/maps/does-not-exist`, {
      headers: { Cookie: playerCookie },
    })
    expect(unknown.status).toBe(404)
    expect((await hidden.json()).message).toBe((await unknown.json()).message)
  })

  it('6.1 pins/layers/regions of a hidden map are refused to a player (design D3)', async () => {
    for (const sub of ['pins', 'layers', 'regions']) {
      const res = await api(`/api/campaigns/${campaignId}/maps/${hiddenSlug}/${sub}`, {
        headers: { Cookie: playerCookie },
      })
      expect(res.status, `${sub} of a hidden map`).toBe(404)
    }
  })

  it('6.1 the image of a hidden map is refused to a player, not served (design D3)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${hiddenSlug}/image`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(404)
  })

  it('6.1 a tile of a hidden map is refused to a player -- no imagery served (design D3, the sharpest case)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${hiddenSlug}/tiles/0/0/0`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(404)
  })

  // --- 6.2: the positive path -- a dm AND a player on the SAME visible map still get everything ---

  it('6.2 both a dm and a player reach the same visible map, its pins/layers/regions, its image and a tile', async () => {
    for (const cookie of [dmCookie, playerCookie]) {
      const mapRes = await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}`, {
        headers: { Cookie: cookie },
      })
      expect(mapRes.status).toBe(200)

      for (const sub of ['pins', 'layers', 'regions']) {
        const res = await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}/${sub}`, {
          headers: { Cookie: cookie },
        })
        expect(res.status, `${sub} for ${cookie === dmCookie ? 'dm' : 'player'}`).toBe(200)
      }

      const imageRes = await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}/image`, {
        headers: { Cookie: cookie },
      })
      expect(imageRes.status, `image for ${cookie === dmCookie ? 'dm' : 'player'}`).toBe(200)

      const tileRes = await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}/tiles/0/0/0`, {
        headers: { Cookie: cookie },
      })
      expect(tileRes.status, `tile for ${cookie === dmCookie ? 'dm' : 'player'}`).toBe(200)
    }
  })

  // --- 6.3: composition -- a visible map may still contain hidden pins (design D4) ---

  it('6.3 a visible map is returned to a player, but its dm_only pin is not -- the map and pin layers compose', async () => {
    const res = await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    const labels = data.pins.map((p: { label: string }) => p.label)
    expect(labels).toContain('Town Square')
    expect(labels).not.toContain('War Room')

    const dmRes = await api(`/api/campaigns/${campaignId}/maps/${visibleSlug}`, {
      headers: { Cookie: dmCookie },
    })
    const dmLabels = (await dmRes.json()).pins.map((p: { label: string }) => p.label)
    expect(dmLabels).toContain('War Room')
  })

  // --- 5.3: nested maps -- a child's own visibility, never inherited from its parent ---

  it("5.3 a visible child of a hidden parent is still reachable -- a child map's visibility is its own", async () => {
    const child = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: {
        name: 'Visible Room',
        width: 500,
        height: 500,
        visibility: 'members',
        parentMapId: (
          await (
            await api(`/api/campaigns/${campaignId}/maps/${hiddenSlug}`, {
              headers: { Cookie: dmCookie },
            })
          ).json()
        ).id,
      },
    })
    const childSlug = (await child.json()).slug

    const asPlayer = await api(`/api/campaigns/${campaignId}/maps/${childSlug}`, {
      headers: { Cookie: playerCookie },
    })
    expect(asPlayer.status).toBe(200)
  })

  it('5.3 a hidden child of a visible parent stays hidden -- not silently exposed via the parent (design D5/tasks 5.3)', async () => {
    const child = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: withCsrf(dmCookie, dmCsrf),
      body: {
        name: 'Secret Room',
        width: 500,
        height: 500,
        visibility: 'dm_only',
        parentMapId: visibleMapId,
      },
    })
    const childSlug = (await child.json()).slug

    const asPlayer = await api(`/api/campaigns/${campaignId}/maps/${childSlug}`, {
      headers: { Cookie: playerCookie },
    })
    expect(asPlayer.status).toBe(404)

    const asDm = await api(`/api/campaigns/${campaignId}/maps/${childSlug}`, {
      headers: { Cookie: dmCookie },
    })
    expect(asDm.status).toBe(200)
  })
})

describe('Map Image Upload (9.18)', () => {
  const email = `map-upload-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'UploadUser', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`
    csrfToken = await getCsrfToken(cookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: `Upload ${Date.now()}` },
    })
    campaignId = (await camp.json()).id
  })

  it('upload endpoint exists and rejects empty body', async () => {
    const map = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'Upload Map', width: 500, height: 500 },
    })
    const mapSlug = (await map.json()).slug

    // Upload without file body — should get an error, not crash
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/maps/${mapSlug}/upload`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
    })
    // Expect 400 (bad request) since no file was attached
    expect([400, 415, 422, 500]).toContain(res.status)
  })
})
