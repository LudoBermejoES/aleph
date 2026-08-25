import { describe, it, expect, beforeAll } from 'vitest'
import { apiRaw, signUpAndLogin } from './helpers'

/**
 * PATCH .../pins/[pinId] (move-pins-and-resolve-entity-images/design.md D2). There was
 * previously NO endpoint at all to move a pin -- only create (POST) and delete (DELETE)
 * existed -- so this is new coverage, not a regression fixture.
 */
describe('Move a map pin (PATCH)', () => {
  const dmEmail = `pin-move-dm-${Date.now()}@example.com`
  const playerEmail = `pin-move-player-${Date.now()}@example.com`
  let dmCookie = ''
  let dmCsrf = ''
  let playerCookie = ''
  let playerCsrf = ''
  let campaignId = ''
  let mapSlug = ''
  let pinId = ''

  beforeAll(async () => {
    const dm = await signUpAndLogin(dmEmail, 'password123', 'Pin Move DM')
    dmCookie = dm.cookie
    dmCsrf = dm.csrfToken

    const camp = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: `Pin Move ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    const map = await apiRaw(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: 'Move Test Map' },
    })
    mapSlug = (await map.json()).slug

    const pin = await apiRaw(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { label: 'Movable Pin', lat: 10, lng: 20 },
    })
    pinId = (await pin.json()).id

    // A player (below editor) to exercise the permission rejection.
    const player = await signUpAndLogin(playerEmail, 'password123', 'Pin Move Player')
    playerCookie = player.cookie
    playerCsrf = player.csrfToken
    const invite = await apiRaw(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { role: 'player' },
    })
    const { token: inviteToken } = await invite.json()
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': playerCsrf },
      body: { token: inviteToken },
    })
  })

  it('valid coordinates persist', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins/${pinId}`, {
      method: 'PATCH',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { lat: 42, lng: 84 },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.lat).toBe(42)
    expect(data.lng).toBe(84)

    const getRes = await apiRaw(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins`, {
      headers: { Cookie: dmCookie },
    })
    const pins = await getRes.json()
    const moved = pins.find((p: Record<string, unknown>) => p.id === pinId)
    expect(moved.lat).toBe(42)
    expect(moved.lng).toBe(84)
  })

  it('a body with label/color/entityId does not apply those fields', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins/${pinId}`, {
      method: 'PATCH',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { lat: 1, lng: 2, label: 'Hijacked label', color: '#000000', entityId: 'nope' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.lat).toBe(1)
    expect(data.lng).toBe(2)
    expect(data.label).toBe('Movable Pin')
    expect(data.entityId).toBeNull()
  })

  it('the returned shape matches the pin-listing endpoint', async () => {
    const patchRes = await apiRaw(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins/${pinId}`, {
      method: 'PATCH',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { lat: 5, lng: 6 },
    })
    const patched = await patchRes.json()

    const listRes = await apiRaw(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins`, {
      headers: { Cookie: dmCookie },
    })
    const listed = (await listRes.json()).find((p: Record<string, unknown>) => p.id === pinId)

    expect(Object.keys(patched).sort()).toEqual(Object.keys(listed).sort())
    expect(patched).toEqual(listed)
  })

  it('a role below editor is rejected', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/maps/${mapSlug}/pins/${pinId}`, {
      method: 'PATCH',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': playerCsrf },
      body: { lat: 99, lng: 99 },
    })
    expect(res.status).toBe(403)
  })
})
