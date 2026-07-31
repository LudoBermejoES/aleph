import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, name: string, password = 'password123') {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfToken = (setCookie.match(/csrf_token=([^;]+)/) || [])[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

function csrfOf(cookie: string) {
  return (cookie.match(/csrf_token=([^;]+)/) || [])[1] || ''
}

/** Cookie-authenticated mutating request (CSRF header included). */
function asUser(cookie: string) {
  return { Cookie: cookie, 'X-CSRF-Token': csrfOf(cookie) }
}

async function createApiKey(cookie: string, name: string) {
  const res = await api('/api/apikeys', { method: 'POST', headers: asUser(cookie), body: { name } })
  return (await res.json()).key as string
}

async function whoami(cookie: string) {
  const res = await api('/api/me', { headers: { Cookie: cookie } })
  return (await res.json()).id as string
}

describe('Character public notes (integration)', () => {
  const ts = Date.now()
  let dmKey = ''
  let dmCookie = ''
  let anaCookie = ''
  let anaKey = ''
  let luisCookie = ''
  let inesCookie = ''
  let visitorCookie = ''
  let anaId = ''
  let luisId = ''
  let campaignId = ''

  /** A character owned by Luis, visible to members — Ana's "someone else's character". */
  let luisChar = ''
  /** A character owned by Ana. */
  let anaChar = ''
  /** visibility: public — the only kind a `visitor` can read at all. */
  let publicChar = ''
  /** visibility: dm_only from creation — invisible to a player. */
  let hiddenChar = ''
  /** members at first, narrowed to dm_only mid-suite. */
  let narrowChar = ''
  /** Created to be deleted, for the cascade regression. */
  let doomedChar = ''

  async function createCharacter(name: string, body: Record<string, unknown> = {}) {
    const res = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name, characterType: 'npc', ...body },
    })
    expect(res.status).toBe(200)
    return (await res.json()).slug as string
  }

  async function joinAs(cookie: string, role: string) {
    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { role },
    })
    const { token } = await invite.json()
    const res = await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: asUser(cookie),
      body: { token },
    })
    expect(res.status).toBe(200)
  }

  /** Read the character as the DM and return its notes array. */
  async function notesOf(slug: string) {
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    return (await res.json()).notes as {
      id: string
      authorUserId: string
      authorName: string
      body: string
      updatedAt: number
    }[]
  }

  function putNote(slug: string, headers: Record<string, string>, body: unknown) {
    return api(`/api/campaigns/${campaignId}/characters/${slug}/notes/me`, {
      method: 'PUT',
      headers,
      body,
    })
  }

  beforeAll(async () => {
    dmCookie = await signUpAndGetCookie(`notes-dm-${ts}@example.com`, 'Notes DM')
    dmKey = await createApiKey(dmCookie, 'dm-key')

    // A PUBLIC campaign, so a non-member authenticated user resolves to the `visitor` role
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Notes Test ${ts}`, isPublic: true },
    })
    campaignId = (await camp.json()).id

    anaCookie = await signUpAndGetCookie(`notes-ana-${ts}@example.com`, 'Ana')
    luisCookie = await signUpAndGetCookie(`notes-luis-${ts}@example.com`, 'Luis')
    inesCookie = await signUpAndGetCookie(`notes-ines-${ts}@example.com`, 'Ines')
    visitorCookie = await signUpAndGetCookie(`notes-visitor-${ts}@example.com`, 'Visitor')

    anaId = await whoami(anaCookie)
    luisId = await whoami(luisCookie)
    anaKey = await createApiKey(anaCookie, 'ana-key')

    await joinAs(anaCookie, 'player')
    await joinAs(luisCookie, 'player')
    await joinAs(inesCookie, 'player')
    // visitorCookie deliberately never joins — a non-member on a public campaign is a `visitor`

    luisChar = await createCharacter(`Luis PC ${ts}`, {
      characterType: 'pc',
      visibility: 'members',
    })
    anaChar = await createCharacter(`Ana PC ${ts}`, { characterType: 'pc', visibility: 'members' })
    publicChar = await createCharacter(`Public NPC ${ts}`, { visibility: 'public' })
    hiddenChar = await createCharacter(`Hidden NPC ${ts}`, { visibility: 'dm_only' })
    narrowChar = await createCharacter(`Narrowing NPC ${ts}`, { visibility: 'members' })
    doomedChar = await createCharacter(`Doomed NPC ${ts}`, { visibility: 'members' })

    // Assign owners (only the DM can, and only through the character PUT)
    for (const [slug, ownerUserId] of [
      [luisChar, luisId],
      [anaChar, anaId],
    ] as const) {
      const res = await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
        method: 'PUT',
        headers: { 'X-API-Key': dmKey },
        body: { ownerUserId },
      })
      expect(res.status).toBe(200)
    }
  })

  // ── Requirement: Who may annotate ─────────────────────────────────────────

  it('a player annotates a character they do NOT own → 200 and the note is stored', async () => {
    const res = await putNote(luisChar, asUser(anaCookie), {
      body: 'He lied about the ledger.',
    })
    expect(res.status).toBe(200)
    const notes = await notesOf(luisChar)
    const ana = notes.find((n) => n.authorUserId === anaId)
    expect(ana).toBeDefined()
    expect(ana!.body).toBe('He lied about the ledger.')
  })

  it("a second member's save does not touch the first member's note", async () => {
    const res = await putNote(luisChar, asUser(luisCookie), { body: 'I never signed anything.' })
    expect(res.status).toBe(200)

    const notes = await notesOf(luisChar)
    expect(notes).toHaveLength(2)
    // The lost update this storage shape exists to prevent
    expect(notes.find((n) => n.authorUserId === anaId)!.body).toBe('He lied about the ledger.')
    expect(notes.find((n) => n.authorUserId === luisId)!.body).toBe('I never signed anything.')
  })

  it('the same author saving twice updates in place — exactly one row for that pair', async () => {
    const res = await putNote(luisChar, asUser(anaCookie), {
      body: 'He lied about the ledger, twice.',
    })
    expect(res.status).toBe(200)

    const notes = await notesOf(luisChar)
    expect(notes).toHaveLength(2)
    const mine = notes.filter((n) => n.authorUserId === anaId)
    expect(mine).toHaveLength(1)
    expect(mine[0]!.body).toBe('He lied about the ledger, twice.')
  })

  it('a player annotates their OWN character → 200; owning it does not remove the notes area', async () => {
    const res = await putNote(anaChar, asUser(anaCookie), { body: 'My own margin notes.' })
    expect(res.status).toBe(200)
    expect((await notesOf(anaChar)).map((n) => n.body)).toContain('My own margin notes.')
  })

  it('a visitor is refused with 403 and stores nothing', async () => {
    // The character is `public`, so the visitor CAN read it — the refusal is about the role,
    // not about visibility. (On a non-public character a visitor gets 404 first; see below.)
    const readable = await api(`/api/campaigns/${campaignId}/characters/${publicChar}`, {
      headers: { Cookie: visitorCookie },
    })
    expect(readable.status).toBe(200)

    const res = await putNote(publicChar, asUser(visitorCookie), { body: 'I should not be here.' })
    expect(res.status).toBe(403)

    expect(await notesOf(publicChar)).toHaveLength(0)
  })

  it('a character the caller cannot see answers 404 — byte-identical to reading it', async () => {
    const read = await api(`/api/campaigns/${campaignId}/characters/${hiddenChar}`, {
      headers: { Cookie: anaCookie },
    })
    expect(read.status).toBe(404)
    const readBody = await read.json()

    const write = await putNote(hiddenChar, asUser(anaCookie), { body: 'peeking' })
    expect(write.status).toBe(404)
    expect((await write.json()).message).toBe(readBody.message)

    const own = await api(`/api/campaigns/${campaignId}/characters/${hiddenChar}/notes/me`, {
      headers: { Cookie: anaCookie },
    })
    expect(own.status).toBe(404)
  })

  it('an unauthenticated request is 401', async () => {
    const res = await putNote(luisChar, {}, { body: 'anonymous' })
    expect(res.status).toBe(401)
  })

  it('X-API-Key authentication stores the note attributed to the key’s user', async () => {
    const res = await putNote(narrowChar, { 'X-API-Key': anaKey }, { body: 'Written by API key.' })
    expect(res.status).toBe(200)

    const notes = await notesOf(narrowChar)
    const mine = notes.find((n) => n.authorUserId === anaId)
    expect(mine).toBeDefined()
    expect(mine!.body).toBe('Written by API key.')
    expect(mine!.authorName).toBe('Ana')
  })

  // ── Requirement: Public notes storage ─────────────────────────────────────

  it('an empty body deletes the row; a whitespace-only body does too', async () => {
    const slug = await createCharacter(`Erasable NPC ${ts}`, { visibility: 'members' })

    await putNote(slug, asUser(anaCookie), { body: 'temporary' })
    await putNote(slug, asUser(luisCookie), { body: 'luis stays' })
    expect(await notesOf(slug)).toHaveLength(2)

    const cleared = await putNote(slug, asUser(anaCookie), { body: '' })
    expect(cleared.status).toBe(200)
    expect((await cleared.json()).note).toBeNull()
    let notes = await notesOf(slug)
    expect(notes).toHaveLength(1)
    expect(notes[0]!.authorUserId).toBe(luisId)

    // …and whitespace-only is treated identically, not stored as a blank note
    await putNote(slug, asUser(anaCookie), { body: 'back again' })
    expect(await notesOf(slug)).toHaveLength(2)
    const blanked = await putNote(slug, asUser(anaCookie), { body: '   \n\t  ' })
    expect(blanked.status).toBe(200)
    notes = await notesOf(slug)
    expect(notes).toHaveLength(1)
    expect(notes.find((n) => n.authorUserId === anaId)).toBeUndefined()
  })

  it('clearing a note that never existed is a no-op 200, not an error', async () => {
    const slug = await createCharacter(`Never Annotated ${ts}`, { visibility: 'members' })
    const res = await putNote(slug, asUser(anaCookie), { body: '  ' })
    expect(res.status).toBe(200)
    expect((await res.json()).note).toBeNull()
    expect(await notesOf(slug)).toHaveLength(0)
  })

  it('deleting the character makes its notes unreachable by every route', async () => {
    // Row-level cascade (character → notes, and user → notes) is asserted directly against
    // the schema in tests/unit/db/character-notes-schema.test.ts; here we assert the API
    // consequence: after the delete there is no route left that serves them.
    await putNote(doomedChar, asUser(anaCookie), { body: 'about to vanish' })
    expect(await notesOf(doomedChar)).toHaveLength(1)

    const del = await api(`/api/campaigns/${campaignId}/characters/${doomedChar}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': dmKey },
    })
    expect(del.status).toBe(200)

    const read = await api(`/api/campaigns/${campaignId}/characters/${doomedChar}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(read.status).toBe(404)
    const own = await api(`/api/campaigns/${campaignId}/characters/${doomedChar}/notes/me`, {
      headers: { Cookie: anaCookie },
    })
    expect(own.status).toBe(404)
  })

  // ── Requirement: Public notes are readable by campaign members ────────────

  it('the character payload carries every note with author id, display name and updatedAt', async () => {
    const notes = await notesOf(luisChar)
    expect(notes).toHaveLength(2)
    for (const n of notes) {
      expect(typeof n.authorUserId).toBe('string')
      expect(typeof n.authorName).toBe('string')
      expect(n.authorName.length).toBeGreaterThan(0)
      expect(n.updatedAt).toBeTruthy()
    }
    expect(notes.map((n) => n.authorName).sort()).toEqual(['Ana', 'Luis'])
  })

  it('notes are ordered by updatedAt descending, so the page and the tests agree', async () => {
    const slug = await createCharacter(`Ordered NPC ${ts}`, { visibility: 'members' })
    await putNote(slug, asUser(anaCookie), { body: 'older' })
    await new Promise((r) => setTimeout(r, 1100)) // updatedAt has second resolution
    await putNote(slug, asUser(luisCookie), { body: 'newer' })

    const notes = await notesOf(slug)
    expect(notes.map((n) => n.body)).toEqual(['newer', 'older'])
  })

  it('another member reading the character sees notes they did not write', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${luisChar}`, {
      headers: { Cookie: inesCookie },
    })
    expect(res.status).toBe(200)
    const notes = (await res.json()).notes as { authorUserId: string }[]
    expect(notes.map((n) => n.authorUserId).sort()).toEqual([anaId, luisId].sort())
  })

  it('a caller reads their own note through /notes/me', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${luisChar}/notes/me`, {
      headers: { Cookie: anaCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.note.body).toBe('He lied about the ledger, twice.')
    expect(data.note.authorUserId).toBe(anaId)
  })

  it('a caller with no note gets 200 and a null note, not 404', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${luisChar}/notes/me`, {
      headers: { Cookie: inesCookie },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ note: null })
  })

  // ── Requirement: The character update route is unchanged ──────────────────

  it('a non-owner player still gets 403 from PUT /characters/:slug', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${luisChar}`, {
      method: 'PUT',
      headers: asUser(anaCookie),
      body: { name: 'Renamed By Ana' },
    })
    expect(res.status).toBe(403)
    expect((await res.json()).message).toBe('You can only edit your own character')
  })

  it('the notes route ignores ownerUserId / visibility / fields and changes no character data', async () => {
    const before = await api(`/api/campaigns/${campaignId}/characters/${luisChar}`, {
      headers: { 'X-API-Key': dmKey },
    })
    const b = await before.json()

    const res = await putNote(luisChar, asUser(anaCookie), {
      body: 'only this should land',
      ownerUserId: anaId,
      visibility: 'public',
      fields: { race: 'usurped' },
      name: 'Renamed Through The Note Route',
    })
    expect(res.status).toBe(200)

    const after = await api(`/api/campaigns/${campaignId}/characters/${luisChar}`, {
      headers: { 'X-API-Key': dmKey },
    })
    const a = await after.json()

    expect(a.ownerUserId).toBe(b.ownerUserId)
    expect(a.visibility).toBe(b.visibility)
    expect(a.name).toBe(b.name)
    expect(a.fields).toEqual(b.fields)
    // …and the only thing that did change is the note body
    expect(a.notes.find((n: { authorUserId: string }) => n.authorUserId === anaId).body).toBe(
      'only this should land',
    )
  })

  it('a non-string body is rejected by validation, not coerced', async () => {
    const res = await putNote(luisChar, asUser(anaCookie), { body: { nested: 'object' } })
    expect(res.status).toBe(422)
  })

  it('a missing body is rejected — the schema is exactly { body: string }', async () => {
    const res = await putNote(luisChar, asUser(anaCookie), { visibility: 'public' })
    expect(res.status).toBe(422)
  })

  // ── Visibility coupling ───────────────────────────────────────────────────

  it('narrowing the character to dm_only takes its notes with it — no route serves them', async () => {
    // Ines has never read narrowChar, so the 5-minute view-permission cache is cold for her.
    const narrow = await api(`/api/campaigns/${campaignId}/characters/${narrowChar}`, {
      method: 'PUT',
      headers: { 'X-API-Key': dmKey },
      body: { visibility: 'dm_only' },
    })
    expect(narrow.status).toBe(200)

    const read = await api(`/api/campaigns/${campaignId}/characters/${narrowChar}`, {
      headers: { Cookie: inesCookie },
    })
    expect(read.status).toBe(404)

    const own = await api(`/api/campaigns/${campaignId}/characters/${narrowChar}/notes/me`, {
      headers: { Cookie: inesCookie },
    })
    expect(own.status).toBe(404)

    const write = await putNote(narrowChar, asUser(inesCookie), { body: 'still here?' })
    expect(write.status).toBe(404)

    // The DM can still see the note that was written before the narrowing
    expect((await notesOf(narrowChar)).map((n) => n.body)).toContain('Written by API key.')
  })
})
