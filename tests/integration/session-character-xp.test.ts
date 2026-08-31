/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Integration coverage for `add-per-character-session-xp`.
 *
 * Every `it()` below names the spec scenario it encodes, from
 * `openspec/changes/add-per-character-session-xp/specs/session-participant-management/spec.md`.
 * The assertions come from the RULE in that file, not from what the handler happens to do — this
 * repo's most repeated defect is a test that pins the bug. When one fails, read the spec first.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const res = await apiRaw(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

interface XpAward {
  characterId: string
  characterName: string
  characterSlug: string
  xp: number
}

describe('Per-character session XP (integration)', () => {
  const stamp = Date.now()
  let dmApiKey = ''
  let coDmApiKey = ''
  let playerApiKey = ''
  let playerUserId = ''
  let campaignId = ''
  let otherCampaignId = ''
  let sessionSlug = ''
  let ottoId = ''
  let juliaId = ''
  let hermitId = ''
  let foreignCharacterId = ''

  const xpUrl = () => `/api/campaigns/${campaignId}/sessions/${sessionSlug}/xp`

  async function readAwards(apiKey = dmApiKey): Promise<XpAward[]> {
    const data = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    return data.xpAwards as XpAward[]
  }

  async function awardOf(characterId: string, apiKey = dmApiKey): Promise<XpAward | undefined> {
    return (await readAwards(apiKey)).find((a) => a.characterId === characterId)
  }

  /** Put the session into a known state; every test that depends on state calls this first. */
  async function setAwards(awards: { characterId: string; xp: number }[]) {
    return api(xpUrl(), { method: 'PUT', headers: { 'X-API-Key': dmApiKey }, body: { awards } })
  }

  beforeAll(async () => {
    const dmCookie = await signUpAndGetCookie(`cxp-dm-${stamp}@example.com`, 'password123', 'CxpDM')
    dmApiKey = (await createApiKey(dmCookie, 'cxp-dm-key')).key

    const playerCookie = await signUpAndGetCookie(
      `cxp-pl-${stamp}@example.com`,
      'password123',
      'CxpPlayer',
    )
    playerApiKey = (await createApiKey(playerCookie, 'cxp-player-key')).key
    const sessionRes = await apiRaw('/api/auth/get-session', { headers: { Cookie: playerCookie } })
    playerUserId = (await sessionRes.json()).user.id

    const coDmCookie = await signUpAndGetCookie(
      `cxp-codm-${stamp}@example.com`,
      'password123',
      'CxpCoDM',
    )
    coDmApiKey = (await createApiKey(coDmCookie, 'cxp-codm-key')).key

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: `Cxp Test ${stamp}` },
    })
    campaignId = camp.id

    // A SECOND campaign, with its own character. Task 3.3: the campaign-membership check cannot
    // possibly fail against a fixture where every character belongs to the campaign, so the
    // cross-campaign character is built explicitly rather than borrowed from the happy path.
    const otherCamp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: `Cxp Other ${stamp}` },
    })
    otherCampaignId = otherCamp.id
    const foreign = await api(`/api/campaigns/${otherCampaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'Forastero', characterType: 'pc' },
    })
    foreignCharacterId = foreign.id

    async function join(cookie: string, role: string) {
      const invite = await api(`/api/campaigns/${campaignId}/invite`, {
        method: 'POST',
        headers: { 'X-API-Key': dmApiKey },
        body: { role },
      })
      const csrfToken = cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
      await api(`/api/campaigns/${campaignId}/join`, {
        method: 'POST',
        headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
        body: { token: invite.token },
      })
    }
    await join(playerCookie, 'player')
    await join(coDmCookie, 'co_dm')

    // Otto and Julia belong to the SAME player: the case `session_attendance`'s (session, user)
    // key cannot represent at all.
    const otto = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'Otto', characterType: 'pc', ownerUserId: playerUserId },
    })
    ottoId = otto.id
    const julia = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'Julia', characterType: 'pc', ownerUserId: playerUserId },
    })
    juliaId = julia.id
    // Never on any attendance roster, on purpose.
    const hermit = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'Ermitanio', characterType: 'pc' },
    })
    hermitId = hermit.id

    const sess = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { title: 'Cxp Session', status: 'completed' },
    })
    sessionSlug = sess.slug

    // One attendance row for the player, carrying Otto — enough to make the roster non-empty.
    await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance/bulk`, {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { attendees: [otto.slug], attended: true },
    })
  })

  // ── Requirement: Award XP to characters for a session ───────────────────────────────────────

  it('scenario: DM records XP for several characters at once', async () => {
    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: {
        awards: [
          { characterId: ottoId, xp: 2 },
          { characterId: juliaId, xp: 3 },
        ],
      },
    })
    expect(res.status).toBe(200)

    const awards = await readAwards()
    expect(awards.find((a) => a.characterId === ottoId)?.xp).toBe(2)
    expect(awards.find((a) => a.characterId === juliaId)?.xp).toBe(3)
  })

  it('scenario: two characters of the same player are awarded separately, neither overwriting the other', async () => {
    await setAwards([
      { characterId: ottoId, xp: 1 },
      { characterId: juliaId, xp: 2 },
    ])
    const awards = await readAwards()
    const forThisPlayer = awards.filter(
      (a) => a.characterId === ottoId || a.characterId === juliaId,
    )
    expect(forThisPlayer).toHaveLength(2)
    expect(awards.find((a) => a.characterId === ottoId)?.xp).toBe(1)
    expect(awards.find((a) => a.characterId === juliaId)?.xp).toBe(2)
  })

  it('scenario: an award of zero is recorded, and is not the same as no award', async () => {
    await setAwards([{ characterId: ottoId, xp: 0 }])
    const ottoAward = await awardOf(ottoId)
    expect(ottoAward).toBeDefined()
    expect(ottoAward?.xp).toBe(0)

    // The other half of the rule: no award at all means NO ENTRY, not an entry reading 0.
    await setAwards([])
    expect(await awardOf(ottoId)).toBeUndefined()
    expect(await readAwards()).toEqual([])
  })

  // Task 3.2 — the load-bearing one. `PUT` replaces, it does not merge.
  it('scenario: a PUT that omits a character removes its award', async () => {
    await setAwards([
      { characterId: ottoId, xp: 2 },
      { characterId: juliaId, xp: 3 },
    ])
    expect(await awardOf(juliaId)).toBeDefined()

    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { awards: [{ characterId: ottoId, xp: 2 }] },
    })
    expect(res.status).toBe(200)

    expect((await awardOf(ottoId))?.xp).toBe(2)
    expect(await awardOf(juliaId)).toBeUndefined()
  })

  it('scenario: a character that did not attend may still be awarded', async () => {
    const detail = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    // Precondition of the scenario, asserted rather than assumed: the hermit is on no roster row.
    expect(
      detail.attendance.some((a: { characterId: string | null }) => a.characterId === hermitId),
    ).toBe(false)

    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { awards: [{ characterId: hermitId, xp: 2 }] },
    })
    expect(res.status).toBe(200)
    expect((await awardOf(hermitId))?.xp).toBe(2)
  })

  // Task 3.3 — the cross-campaign fixture.
  it('scenario: a character from another campaign is refused with 422 and nothing is recorded', async () => {
    await setAwards([{ characterId: ottoId, xp: 4 }])

    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: {
        awards: [
          { characterId: ottoId, xp: 9 },
          { characterId: foreignCharacterId, xp: 1 },
        ],
      },
    })
    expect(res.status).toBe(422)

    // "nothing is recorded" — including the legal half of a partly-illegal body. The whole write
    // is one transaction, so Otto must still read 4, not 9.
    const awards = await readAwards()
    expect(awards.find((a) => a.characterId === foreignCharacterId)).toBeUndefined()
    expect(awards.find((a) => a.characterId === ottoId)?.xp).toBe(4)
  })

  it('a characterId that exists in no campaign at all is refused with 422', async () => {
    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { awards: [{ characterId: 'no-such-character-id', xp: 1 }] },
    })
    expect(res.status).toBe(422)
  })

  it('scenario: negative and fractional values are refused, and no award is written', async () => {
    await setAwards([])

    const negative = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { awards: [{ characterId: ottoId, xp: -1 }] },
    })
    expect(negative.status).toBe(422)
    expect(await awardOf(ottoId)).toBeUndefined()

    const fractional = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { awards: [{ characterId: ottoId, xp: 1.5 }] },
    })
    expect(fractional.status).toBe(422)
    expect(await awardOf(ottoId)).toBeUndefined()
  })

  it('the same characterId twice in one body is refused with 422', async () => {
    await setAwards([])
    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: {
        awards: [
          { characterId: ottoId, xp: 1 },
          { characterId: ottoId, xp: 2 },
        ],
      },
    })
    expect(res.status).toBe(422)
    expect(await awardOf(ottoId)).toBeUndefined()
  })

  it('a body whose award key is snake_case is refused, not silently accepted (task 2.6)', async () => {
    await setAwards([])
    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { awards: [{ character_id: ottoId, xp: 2 }] },
    })
    expect(res.status).toBe(422)
    expect(await readAwards()).toEqual([])
  })

  it('scenario: a player may not award XP — 403 and nothing is recorded', async () => {
    await setAwards([])
    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { awards: [{ characterId: ottoId, xp: 1 }] },
    })
    expect(res.status).toBe(403)
    expect(await readAwards()).toEqual([])
  })

  it('a co_dm may award XP', async () => {
    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': coDmApiKey },
      body: { awards: [{ characterId: ottoId, xp: 7 }] },
    })
    expect(res.status).toBe(200)
    expect((await awardOf(ottoId))?.xp).toBe(7)
  })

  it('an unauthenticated PUT is 401', async () => {
    const res = await apiRaw(xpUrl(), {
      method: 'PUT',
      body: { awards: [{ characterId: ottoId, xp: 1 }] },
    })
    expect(res.status).toBe(401)
  })

  it('an unknown session slug is 404', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/does-not-exist/xp`, {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { awards: [] },
    })
    expect(res.status).toBe(404)
  })

  it('re-sending the same award list is idempotent, not a duplicate row', async () => {
    await setAwards([{ characterId: ottoId, xp: 5 }])
    await setAwards([{ characterId: ottoId, xp: 5 }])
    const awards = await readAwards()
    expect(awards.filter((a) => a.characterId === ottoId)).toHaveLength(1)
    expect(awards[0].xp).toBe(5)
  })

  // ── Requirement: Clear one character's XP award ─────────────────────────────────────────────

  it('scenario: DM clears a single award — 204, and other characters are untouched', async () => {
    await setAwards([
      { characterId: ottoId, xp: 2 },
      { characterId: juliaId, xp: 3 },
    ])
    const res = await apiRaw(`${xpUrl()}/${ottoId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(204)

    expect(await awardOf(ottoId)).toBeUndefined()
    expect((await awardOf(juliaId))?.xp).toBe(3)
  })

  it("clearing an award only touches THIS session's copy of that character's award", async () => {
    // A character can be awarded on many sessions. Deleting by character alone — forgetting the
    // session in the WHERE — would silently wipe its history everywhere.
    const other = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { title: `Cxp Delete Isolation ${stamp}`, status: 'completed' },
    })
    await setAwards([{ characterId: ottoId, xp: 2 }])
    await api(`/api/campaigns/${campaignId}/sessions/${other.slug}/xp`, {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: { awards: [{ characterId: ottoId, xp: 9 }] },
    })

    const res = await apiRaw(`${xpUrl()}/${ottoId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(204)

    expect(await awardOf(ottoId)).toBeUndefined()
    const otherDetail = await api(`/api/campaigns/${campaignId}/sessions/${other.slug}`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(otherDetail.xpAwards).toEqual([{ ...otherDetail.xpAwards[0], xp: 9 }])
    expect(otherDetail.xpAwards[0].characterId).toBe(ottoId)
  })

  it('scenario: clearing an award that was never recorded is 404', async () => {
    await setAwards([{ characterId: juliaId, xp: 3 }])
    const res = await apiRaw(`${xpUrl()}/${ottoId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(404)
  })

  it('a player may not clear an award', async () => {
    await setAwards([{ characterId: ottoId, xp: 2 }])
    const res = await apiRaw(`${xpUrl()}/${ottoId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
    expect((await awardOf(ottoId))?.xp).toBe(2)
  })

  it('clearing on an unknown session slug is 404', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/does-not-exist/xp/${ottoId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(404)
  })

  // ── Requirement: Session detail reports its XP awards ───────────────────────────────────────

  it('scenario: awards are returned with the session, with the character display name', async () => {
    await setAwards([{ characterId: ottoId, xp: 2 }])
    const awards = await readAwards(playerApiKey) // any member who may see attendance
    expect(awards).toHaveLength(1)
    expect(awards[0]).toMatchObject({ characterId: ottoId, xp: 2, characterName: 'Otto' })
    expect(awards[0].characterSlug).toBeTruthy()
  })

  it("the PUT's own response reports the STORED awards, identical to what GET then returns", async () => {
    // The response must be evidence of what was written, not an echo of what was asked for —
    // otherwise a save that silently stored something else still looks like it worked.
    const written = await api(xpUrl(), {
      method: 'PUT',
      headers: { 'X-API-Key': dmApiKey },
      body: {
        awards: [
          { characterId: ottoId, xp: 2 },
          { characterId: juliaId, xp: 0 },
        ],
      },
    })
    expect(written.success).toBe(true)
    const read = await readAwards()
    expect(written.xpAwards).toEqual(read)
    for (const entry of written.xpAwards as XpAward[]) {
      expect(entry.characterName).toBeTruthy()
      expect(entry.characterSlug).toBeTruthy()
    }
  })

  it('xpAwards is an empty array — present, not missing — when nothing is recorded', async () => {
    await setAwards([])
    const data = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(Array.isArray(data.xpAwards)).toBe(true)
    expect(data.xpAwards).toEqual([])
  })

  it('an award survives on the session it was written to and does not leak to another session', async () => {
    const other = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { title: `Cxp Other Session ${stamp}`, status: 'completed' },
    })
    await setAwards([{ characterId: ottoId, xp: 6 }])
    const otherDetail = await api(`/api/campaigns/${campaignId}/sessions/${other.slug}`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(otherDetail.xpAwards).toEqual([])
    expect((await awardOf(ottoId))?.xp).toBe(6)
  })

  // ── REMOVED Requirement: Record XP for a session participant ────────────────────────────────

  /**
   * Task 3.4 — the old per-user route's deletion is covered, not merely assumed.
   *
   * This test was written the day before `server/api/[...].ts` existed, and it PINNED THE BUG:
   * at the time an unmatched API path fell through to the SPA shell and answered
   * `200 text/html`, so the assertion read "the removed route no longer answers
   * application/json" — which is satisfied by an HTML skeleton with a 200 on it. It is the ninth
   * instance in this project of a green test asserting a defect, and it is recorded here rather
   * than quietly rewritten.
   *
   * The rule the task actually wanted is now the rule the server has: an unmatched API path is a
   * 404 with JSON. The control path is kept, because "behaves exactly like a route that was
   * never there" is the real requirement; the `Unknown API route` marker is what tells a
   * catch-all 404 apart from a 404 a real handler raised, so restoring
   * `attendance/[userId].patch.ts` still breaks this immediately.
   */
  it('the removed per-user XP route no longer exists', async () => {
    const removed = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance/${playerUserId}`,
      { method: 'PATCH', headers: { 'X-API-Key': dmApiKey }, body: { xp: 2 } },
    )
    const neverExisted = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/never-existed/${playerUserId}`,
      { method: 'PATCH', headers: { 'X-API-Key': dmApiKey }, body: { xp: 2 } },
    )

    expect(removed.status).toBe(404)
    expect(removed.headers.get('content-type')).toContain('application/json')
    expect(removed.status).toBe(neverExisted.status)
    expect(removed.headers.get('content-type')).toBe(neverExisted.headers.get('content-type'))

    // Answered by the catch-all, not by a handler that still exists.
    expect((await removed.json()).message).toContain('Unknown API route')
  })

  it('no XP was written by the removed route either', async () => {
    await setAwards([])
    await apiRaw(
      `/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance/${playerUserId}`,
      { method: 'PATCH', headers: { 'X-API-Key': dmApiKey }, body: { xp: 2 } },
    )
    expect(await readAwards()).toEqual([])
  })

  it('the attendance roster no longer carries an xp field', async () => {
    const data = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(data.attendance.length).toBeGreaterThan(0)
    for (const row of data.attendance) {
      expect(row).not.toHaveProperty('xp')
    }
  })
})
