import { describe, it, expect, beforeAll } from 'vitest'
import { apiRaw, signUpAndLogin } from './helpers'

/**
 * show-entity-map-pins: the reverse lookup endpoint (`GET
 * /api/campaigns/{id}/entities/{slug}/map-pins`), and the visibility rule it must apply
 * (design.md D2 -- filtered on the MAP's own visibility, not the entity's, since the viewer
 * reaching this endpoint from an entity's own page already sees the entity).
 *
 * NOTE (repo CLAUDE.md): the dev server used by `npm run test:integration` does not bind its
 * port on this machine, so this file could not be executed here -- it is written to the same
 * pattern as the neighboring `maps-visibility.test.ts` and is expected to run in CI.
 */
describe('GET entities/[slug]/map-pins (show-entity-map-pins)', () => {
  let dmCookie = ''
  let dmCsrf = ''
  let playerCookie = ''
  let campaignId = ''
  let mapVisibleSlug = ''
  let mapHiddenSlug = ''
  let locationSlug = ''
  let characterSlug = ''
  let orgSlug = ''
  let orgEntitySlug = ''

  beforeAll(async () => {
    const dm = await signUpAndLogin(`map-pins-dm-${Date.now()}@example.com`)
    dmCookie = dm.cookie
    dmCsrf = dm.csrfToken

    const camp = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: `Map Pins ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    const mapVisible = await apiRaw(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: 'Berlin', width: 1000, height: 1000, visibility: 'members' },
    })
    mapVisibleSlug = (await mapVisible.json()).slug

    const mapHidden = await apiRaw(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: 'Secret War Room', width: 1000, height: 1000, visibility: 'dm_only' },
    })
    mapHiddenSlug = (await mapHidden.json()).slug

    const location = await apiRaw(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: 'Berghain', visibility: 'members' },
    })
    const locationBody = await location.json()
    locationSlug = locationBody.slug

    const character = await apiRaw(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: 'Karoline Ober', visibility: 'members' },
    })
    const characterBody = await character.json()
    characterSlug = characterBody.slug

    const org = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: 'Sabbat Incursion', visibility: 'members' },
    })
    const orgBody = await org.json()
    orgSlug = orgBody.slug

    const orgGet = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}`, {
      headers: { Cookie: dmCookie },
    })
    orgEntitySlug = (await orgGet.json()).entitySlug

    // Pin the location on BOTH maps -- one visible to a player, one not.
    await apiRaw(`/api/campaigns/${campaignId}/maps/${mapVisibleSlug}/pins`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { entityId: locationBody.id, lat: 1, lng: 1 },
    })
    await apiRaw(`/api/campaigns/${campaignId}/maps/${mapHiddenSlug}/pins`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { entityId: locationBody.id, lat: 2, lng: 2 },
    })
    // Character and organization each pinned once, on the visible map.
    await apiRaw(`/api/campaigns/${campaignId}/maps/${mapVisibleSlug}/pins`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { entityId: characterBody.entityId, lat: 3, lng: 3, label: 'Safehouse' },
    })
    await apiRaw(`/api/campaigns/${campaignId}/maps/${mapVisibleSlug}/pins`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { entityId: orgBody.entityId, lat: 4, lng: 4 },
    })

    // Player, invited as 'player' -- below the hidden map's dm_only visibility.
    const player = await signUpAndLogin(`map-pins-player-${Date.now()}@example.com`)
    playerCookie = player.cookie
    const invite = await apiRaw(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { role: 'player' },
    })
    const { token: inviteToken } = await invite.json()
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': player.csrfToken },
      body: { token: inviteToken },
    })
  })

  it('a location pinned on two maps returns only the one the player may see (D2)', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${locationSlug}/map-pins`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(200)
    const placements = await res.json()
    expect(placements).toHaveLength(1)
    expect(placements[0].mapSlug).toBe(mapVisibleSlug)
    // Never a blanked slug for the hidden one.
    expect(placements.some((p: { mapSlug: string | null }) => p.mapSlug === null)).toBe(false)
  })

  it('the DM sees both placements for the same location', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${locationSlug}/map-pins`, {
      headers: { Cookie: dmCookie },
    })
    const placements = await res.json()
    expect(placements).toHaveLength(2)
    const slugs = placements.map((p: { mapSlug: string }) => p.mapSlug).sort()
    expect(slugs).toEqual([mapHiddenSlug, mapVisibleSlug].sort())
  })

  it('a character resolves the same way, by its own (entity) slug, including its custom label', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${characterSlug}/map-pins`, {
      headers: { Cookie: playerCookie },
    })
    const placements = await res.json()
    expect(placements).toHaveLength(1)
    expect(placements[0].mapSlug).toBe(mapVisibleSlug)
    expect(placements[0].label).toBe('Safehouse')
  })

  it('an organization resolves via its ENTITY slug, not its own (potentially different) slug', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${orgEntitySlug}/map-pins`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(200)
    const placements = await res.json()
    expect(placements).toHaveLength(1)
    expect(placements[0].mapSlug).toBe(mapVisibleSlug)
  })

  it('the organization GET endpoint exposes entitySlug for the page to call this with', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}`, {
      headers: { Cookie: dmCookie },
    })
    const org = await res.json()
    expect(org.entitySlug).toBe(orgEntitySlug)
  })

  it('an entity with no placements returns an empty list, not an error', async () => {
    const location = await apiRaw(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: 'Unpinned Location', visibility: 'members' },
    })
    const { slug: unpinnedSlug } = await location.json()

    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${unpinnedSlug}/map-pins`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('a nonexistent entity slug 404s', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/does-not-exist/map-pins`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(404)
  })
})
