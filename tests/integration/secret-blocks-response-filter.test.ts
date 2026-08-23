import { describe, it, expect, beforeAll } from 'vitest'

/**
 * The response-wide secret filter (`server/plugins/strip-secrets.ts`).
 *
 * `stripSecretBlocks` was already correct, but calling it was OPT-IN AT THE POINT OF USE, so
 * a field was only filtered if whoever added it remembered to wrap it — and across the API
 * most fields never were. Every case below is a field that shipped `:::secret{.dm}` verbatim
 * to a player before the filter existed; each one fails without it.
 *
 * The player here is a REAL second account that joined the campaign with `role: player`, not
 * a `preview_as` simulation — `preview_as` is exercised separately, since a DM previewing the
 * page must land on the same answer.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

const PUBLIC_LINE = 'Everyone may read this.'
const DM_LINE = 'THE-DM-ONLY-NEEDLE'
const SECRET_TEXT = `${PUBLIC_LINE}\n\n:::secret{.dm}\n${DM_LINE}\n:::\n`

const REVEALED_BLOCK_ID = 'revealed-block-1'
const REVEALED_LINE = 'THE-REVEALED-NEEDLE'
const REVEALABLE_TEXT =
  `${PUBLIC_LINE}\n\n:::secret{.dm #${REVEALED_BLOCK_ID}}\n${REVEALED_LINE}\n:::\n` +
  `\n:::secret{.dm}\n${DM_LINE}\n:::\n`

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, name = 'Test User') {
  const password = 'password123'
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const match = (res.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const csrfMatch = (getRes.headers.get('set-cookie') || '').match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, keyName: string) {
  const csrfToken = cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
  const res = await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name: keyName },
  })
  return (await res.json()).key as string
}

describe('secret blocks are filtered out of every campaign-scoped response field', () => {
  const ts = Date.now()

  let dmKey = ''
  let playerKey = ''
  let campaignId = ''
  let charSlug = ''
  let sessionSlug = ''
  let entitySlug = ''
  let arcId = ''

  const asDm = () => ({ 'X-API-Key': dmKey })
  const asPlayer = () => ({ 'X-API-Key': playerKey })

  beforeAll(async () => {
    // --- DM ---
    const dmCookie = await signUpAndGetCookie(`secfilter-dm-${ts}@example.com`, 'DM User')
    dmKey = await createApiKey(dmCookie, `secfilter-dm-key-${ts}`)

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: asDm(),
      body: { name: `Secret Filter Test ${ts}` },
    })
    campaignId = (await campRes.json()).id

    // --- a real player who joined the campaign ---
    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: asDm(),
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()

    const playerCookie = await signUpAndGetCookie(
      `secfilter-player-${ts}@example.com`,
      'Player User',
    )
    const playerCsrf = playerCookie.match(/csrf_token=([^;]+)/)?.[1] || ''
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': playerCsrf },
      body: { token },
    })
    playerKey = await createApiKey(playerCookie, `secfilter-player-key-${ts}`)

    // --- a character with a secret block in EVERY narrative field ---
    const charRes = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: asDm(),
      body: { name: `Needle Bearer ${ts}`, characterType: 'npc', content: SECRET_TEXT },
    })
    charSlug = (await charRes.json()).slug
    await api(`/api/campaigns/${campaignId}/characters/${charSlug}`, {
      method: 'PUT',
      headers: asDm(),
      body: { backstory: SECRET_TEXT, history: SECRET_TEXT, currentStatus: SECRET_TEXT },
    })

    // --- a session: its `summary` column and its whole markdown log ---
    const sessionRes = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: asDm(),
      body: {
        title: `Needle Session ${ts}`,
        content: SECRET_TEXT,
        summary: SECRET_TEXT,
        status: 'completed',
      },
    })
    sessionSlug = (await sessionRes.json()).slug

    // --- an arc + chapter: `arcs` strips, the `chapters` list serving the same rows did not ---
    const arcRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: asDm(),
      body: { name: `Needle Arc ${ts}`, description: SECRET_TEXT, status: 'active' },
    })
    arcId = (await arcRes.json()).id

    await api(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: asDm(),
      body: { name: `Needle Chapter ${ts}`, arcId, description: SECRET_TEXT },
    })

    // --- a plain entity, for the reveal path ---
    const entRes = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: asDm(),
      body: { type: 'note', name: `Needle Note ${ts}`, content: REVEALABLE_TEXT },
    })
    entitySlug = (await entRes.json()).slug
  })

  // ---------------------------------------------------------------- the reported defect ----

  describe('character narrative fields', () => {
    const fields = ['content', 'description', 'backstory', 'history', 'currentStatus'] as const

    it('the DM sees the secret block in every narrative field', async () => {
      const res = await api(`/api/campaigns/${campaignId}/characters/${charSlug}`, {
        headers: asDm(),
      })
      expect(res.status).toBe(200)
      const char = await res.json()
      for (const field of fields) {
        expect(char[field], `DM lost ${field}`).toContain(DM_LINE)
        // The wrapper survives too: the reader UI needs it to render the block AS a secret.
        expect(char[field], `DM lost the wrapper on ${field}`).toContain(':::secret')
      }
    })

    it('a player sees none of it, and still sees the public text', async () => {
      const res = await api(`/api/campaigns/${campaignId}/characters/${charSlug}`, {
        headers: asPlayer(),
      })
      expect(res.status).toBe(200)
      const char = await res.json()
      for (const field of fields) {
        expect(char[field], `${field} leaked to a player`).not.toContain(DM_LINE)
        expect(char[field], `${field} lost its public text`).toContain(PUBLIC_LINE)
      }
    })

    it('a DM previewing as a player gets the same answer the player got', async () => {
      const res = await api(
        `/api/campaigns/${campaignId}/characters/${charSlug}?preview_as=player`,
        { headers: asDm() },
      )
      const char = await res.json()
      for (const field of fields) {
        expect(char[field], `${field} leaked in preview_as=player`).not.toContain(DM_LINE)
        expect(char[field]).toContain(PUBLIC_LINE)
      }
    })

    it('a player cannot escalate with preview_as=dm', async () => {
      const res = await api(`/api/campaigns/${campaignId}/characters/${charSlug}?preview_as=dm`, {
        headers: asPlayer(),
      })
      const char = await res.json()
      for (const field of fields) {
        expect(char[field], `${field} leaked via preview_as=dm`).not.toContain(DM_LINE)
      }
    })
  })

  // -------------------------------------------------- the same mistake, other endpoints ----

  describe('session summary and log', () => {
    it('the DM sees both', async () => {
      const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
        headers: asDm(),
      })
      const session = await res.json()
      expect(session.summary).toContain(DM_LINE)
      expect(session.logContent).toContain(DM_LINE)
    })

    it('a player sees neither', async () => {
      const res = await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
        headers: asPlayer(),
      })
      expect(res.status).toBe(200)
      const session = await res.json()
      expect(session.summary, 'session.summary leaked').not.toContain(DM_LINE)
      expect(session.logContent, 'session.logContent leaked the whole log').not.toContain(DM_LINE)
      expect(session.logContent).toContain(PUBLIC_LINE)
    })

    it('a player sees no secret in the session LIST summary either', async () => {
      const res = await api(`/api/campaigns/${campaignId}/sessions`, { headers: asPlayer() })
      const body = await res.json()
      const rows = Array.isArray(body) ? body : (body.data ?? [])
      const row = rows.find((s: Record<string, unknown>) => s.slug === sessionSlug)
      expect(row, 'session missing from the list').toBeDefined()
      expect(row.summary).not.toContain(DM_LINE)
    })
  })

  describe('chapter descriptions (the list endpoint beside one that already stripped)', () => {
    it('the DM sees the secret', async () => {
      const res = await api(`/api/campaigns/${campaignId}/chapters?arc_id=${arcId}`, {
        headers: asDm(),
      })
      const body = await res.json()
      const rows = Array.isArray(body) ? body : (body.data ?? [])
      expect(rows.some((c: { description?: string }) => c.description?.includes(DM_LINE))).toBe(
        true,
      )
    })

    it('a player does not', async () => {
      const res = await api(`/api/campaigns/${campaignId}/chapters?arc_id=${arcId}`, {
        headers: asPlayer(),
      })
      const body = await res.json()
      const rows = Array.isArray(body) ? body : (body.data ?? [])
      expect(rows.length).toBeGreaterThan(0)
      for (const chapter of rows) {
        expect(chapter.description ?? '', 'chapter.description leaked').not.toContain(DM_LINE)
      }
    })
  })

  // ------------------------------------------------------------------- must not regress ----

  describe('revealedBlockIds still work', () => {
    it('a player sees a block the DM explicitly revealed, and nothing else', async () => {
      const revealRes = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/secrets`, {
        method: 'POST',
        headers: asDm(),
        body: { blockId: REVEALED_BLOCK_ID },
      })
      expect(revealRes.status).toBeLessThan(300)

      const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/render`, {
        headers: asPlayer(),
      })
      expect(res.status).toBe(200)
      const { content } = await res.json()

      expect(content, 'the revealed block was hidden').toContain(REVEALED_LINE)
      // Revealed means UNWRAPPED — it renders as ordinary prose, not as a secret.
      expect(content).not.toContain(':::secret')
      expect(content, 'the un-revealed block leaked').not.toContain(DM_LINE)
    })

    it('the DM still sees both blocks with their wrappers', async () => {
      const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/render`, {
        headers: asDm(),
      })
      const { content } = await res.json()
      expect(content).toContain(REVEALED_LINE)
      expect(content).toContain(DM_LINE)
      expect(content).toContain(':::secret')
    })
  })
})
