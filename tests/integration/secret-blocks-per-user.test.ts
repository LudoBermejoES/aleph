import { describe, it, expect, beforeAll } from 'vitest'

/**
 * `:::secret{.player:alice,bob}` end-to-end, through the real API and the real middleware
 * stack (as opposed to `tests/unit/server/stripSecretBlocks.test.ts`, which calls the pure
 * function directly).
 *
 * The measured defect: the function every response actually goes through
 * (`server/services/content.ts`'s `stripSecretBlocks`, reached both directly by handlers and
 * via the response-wide `server/plugins/strip-secrets.ts` filter) only ever compared ROLE
 * LEVELS. A `:::secret{.player:<id>}` block degraded to plain `.player`, so ANY player in the
 * campaign — not just the one named — could read it. This suite uses two REAL player accounts
 * with distinct ids, exactly the shape that was broken: same role, different identity.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, name: string) {
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

function csrfOf(cookie: string) {
  return (cookie.match(/csrf_token=([^;]+)/) || [])[1] || ''
}

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

describe('a :::secret{.player:<id>} block reaches only the listed user, over the real API', () => {
  const ts = Date.now()

  let dmKey = ''
  let aliceCookie = ''
  let aliceKey = ''
  let aliceId = ''
  let bobCookie = ''
  let bobKey = ''
  let campaignId = ''
  let entitySlug = ''
  let charSlug = ''
  let locationSlug = ''

  const PUBLIC_LINE = 'Todos pueden leer esto.'
  const ALICE_NEEDLE = 'LA-TRAMPILLA-SOLO-DE-ALICE'

  const asDm = () => ({ 'X-API-Key': dmKey })
  const asAlice = () => ({ 'X-API-Key': aliceKey })
  const asBob = () => ({ 'X-API-Key': bobKey })

  beforeAll(async () => {
    const dmCookie = await signUpAndGetCookie(`secperuser-dm-${ts}@example.com`, 'DM User')
    dmKey = await createApiKey(dmCookie, `secperuser-dm-key-${ts}`)

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: asDm(),
      body: { name: `Secret Per User Test ${ts}` },
    })
    campaignId = (await campRes.json()).id

    // --- two real players who both join with the SAME role ---
    aliceCookie = await signUpAndGetCookie(`secperuser-alice-${ts}@example.com`, 'Alice')
    aliceId = await whoami(aliceCookie)

    bobCookie = await signUpAndGetCookie(`secperuser-bob-${ts}@example.com`, 'Bob')

    for (const cookie of [aliceCookie, bobCookie]) {
      const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
        method: 'POST',
        headers: asDm(),
        body: { role: 'player' },
      })
      const { token } = await inviteRes.json()
      const joinRes = await api(`/api/campaigns/${campaignId}/join`, {
        method: 'POST',
        headers: asUser(cookie),
        body: { token },
      })
      expect(joinRes.status).toBe(200)
    }

    aliceKey = await createApiKey(aliceCookie, `secperuser-alice-key-${ts}`)
    bobKey = await createApiKey(bobCookie, `secperuser-bob-key-${ts}`)

    // The block is only computed once we know Alice's real user id.
    const ALICE_BLOCK = `${PUBLIC_LINE}\n\n:::secret{.player:${aliceId}}\n${ALICE_NEEDLE}\n:::\n`

    // --- a plain entity (note) carrying the block ---
    const entRes = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: asDm(),
      body: { type: 'note', name: `Per-user Note ${ts}`, content: ALICE_BLOCK },
    })
    entitySlug = (await entRes.json()).slug

    // --- a character carrying the block, for the /characters/[slug] read path ---
    const charRes = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: asDm(),
      body: { name: `Per-user Character ${ts}`, characterType: 'npc', content: ALICE_BLOCK },
    })
    charSlug = (await charRes.json()).slug

    // --- a location carrying the block, for the /locations/[slug] read path ---
    const locRes = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: asDm(),
      body: { type: 'location', name: `Per-user Location ${ts}`, content: ALICE_BLOCK },
    })
    locationSlug = (await locRes.json()).slug
  })

  describe('entity render endpoint', () => {
    it('the DM sees the block, wrapper included', async () => {
      const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/render`, {
        headers: asDm(),
      })
      expect(res.status).toBe(200)
      const { content } = await res.json()
      expect(content).toContain(ALICE_NEEDLE)
    })

    it('Alice — the listed user — sees it', async () => {
      const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/render`, {
        headers: asAlice(),
      })
      expect(res.status).toBe(200)
      const { content } = await res.json()
      expect(content).toContain(ALICE_NEEDLE)
      expect(content).toContain(PUBLIC_LINE)
    })

    it('Bob — same role, NOT listed — does not see it: the reported leak', async () => {
      const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/render`, {
        headers: asBob(),
      })
      expect(res.status).toBe(200)
      const { content } = await res.json()
      expect(content, "Bob read Alice's secret").not.toContain(ALICE_NEEDLE)
      expect(content).toContain(PUBLIC_LINE)
    })
  })

  describe('entity index endpoint', () => {
    it('Alice sees it, Bob does not', async () => {
      const [aliceRes, bobRes] = await Promise.all([
        api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, { headers: asAlice() }),
        api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, { headers: asBob() }),
      ])
      const [aliceBody, bobBody] = await Promise.all([aliceRes.json(), bobRes.json()])
      expect(aliceBody.content).toContain(ALICE_NEEDLE)
      expect(bobBody.content).not.toContain(ALICE_NEEDLE)
    })
  })

  describe('character read endpoint', () => {
    it('Alice sees it in every narrative field it reaches, Bob does not', async () => {
      const [aliceRes, bobRes] = await Promise.all([
        api(`/api/campaigns/${campaignId}/characters/${charSlug}`, { headers: asAlice() }),
        api(`/api/campaigns/${campaignId}/characters/${charSlug}`, { headers: asBob() }),
      ])
      expect(aliceRes.status).toBe(200)
      expect(bobRes.status).toBe(200)
      const [alice, bob] = await Promise.all([aliceRes.json(), bobRes.json()])
      expect(alice.content, 'Alice lost her own secret').toContain(ALICE_NEEDLE)
      expect(bob.content, "Bob read Alice's secret via /characters").not.toContain(ALICE_NEEDLE)
    })
  })

  describe('location read endpoint', () => {
    it('Alice sees it, Bob does not', async () => {
      const [aliceRes, bobRes] = await Promise.all([
        api(`/api/campaigns/${campaignId}/locations/${locationSlug}`, { headers: asAlice() }),
        api(`/api/campaigns/${campaignId}/locations/${locationSlug}`, { headers: asBob() }),
      ])
      expect(aliceRes.status).toBe(200)
      expect(bobRes.status).toBe(200)
      const [alice, bob] = await Promise.all([aliceRes.json(), bobRes.json()])
      expect(alice.content).toContain(ALICE_NEEDLE)
      expect(bob.content).not.toContain(ALICE_NEEDLE)
    })
  })

  /**
   * `/search` returns `{ results, query }`, each result keyed by the entity's DB id, with the
   * human-readable `slug` alongside it — search by slug, not by the (unrelated) `entityId`.
   *
   * **What these assert, and why it is NOT "the entity must be absent from the results".**
   *
   * The rule, from `openspec/specs/entity-search/spec.md`, is that a term living only inside a
   * secret block must not return a result for that entity **on account of that term**, and that
   * no excerpt may quote the block. It is NOT that the ENTITY becomes invisible: the note here
   * is an ordinary `members`-visible sheet that both players can already list and open; only the
   * block inside it is restricted, and Alice is even allowed to read that.
   *
   * An earlier version asserted `results.some(r => r.slug === entitySlug) === false` for Alice,
   * which is a different — and untrue — claim. `/search` is HYBRID: the lexical arm queries
   * `entities_fts_filtered` (provably free of the needle) and the semantic arm queries
   * `entity_vectors_filtered`, a KNN over the entity's PUBLIC text. KNN always has a nearest
   * neighbour, so whether this entity appears at all is decided by `SEMANTIC_MAX_DISTANCE`
   * (0.15, `server/services/embeddings.ts`) — a cutoff that comment already documents as
   * uncalibratable across architectures.
   *
   * Measured 2026-09-13 on arm64 with the real pipeline: the needle sits at **0.15974** against
   * this entity's filtered text — outside by 0.0097 — while invented strings that appear nowhere
   * in the campaign land at 0.16054–0.17227, i.e. the SAME band. So the needle is not special;
   * the proximity is noise over the public line. And the distance moves with the `Date.now()`
   * baked into the fixture's name: **0.15562–0.17490** across six timestamps, a 0.0193 spread
   * against a 0.0097 margin. That assertion was therefore a coin flip re-tossed every run, and
   * x64 CI (which `embeddings.ts` records as computing systematically LOWER distances than ARM)
   * called it the other way. A green run of it was never evidence that the rule held.
   *
   * What IS deterministic, and is what the rule actually says:
   *   - no result may come from the LEXICAL arm, because the filtered index cannot contain the
   *     needle — that is the arm a secret term would have to travel through;
   *   - no excerpt may carry any part of the block;
   *   - and the Narrator keeps both.
   * A semantic-only hit carries `arms: ['semantic']` and an EMPTY snippet (verified against the
   * real services: the player gets `{entityId, arms:['semantic']}`, nothing else), so it hands
   * over the entity's public name and slug and no syllable of the secret.
   */
  describe('the campaign search endpoint never surfaces the SECRET, in either arm', () => {
    type SearchResult = { slug?: string; snippet?: string; arms?: string[] }
    const search = async (needle: string, headers: Record<string, string>) => {
      const res = await api(`/api/campaigns/${campaignId}/search?q=${encodeURIComponent(needle)}`, {
        headers,
      })
      expect(res.status).toBe(200)
      return ((await res.json()) as { results: SearchResult[] }).results
    }

    // The anti-false-green control, and it is not optional: every assertion below is of the form
    // "nothing came back through this channel", which an EMPTY INDEX satisfies just as well as a
    // correct one. This proves the entity really is in the copy of the index Alice queries at the
    // moment she queries it — so a timing hole in indexing would fail HERE, loudly, instead of
    // making the leak checks pass for the wrong reason.
    it("the note IS in the player's index, reachable by its public line", async () => {
      const results = await search(PUBLIC_LINE, asAlice())
      const hit = results.find((r) => r.slug === entitySlug)
      expect(hit, 'the note is not in the filtered index at all').toBeDefined()
      expect(hit!.arms).toContain('lexical')
    })

    it('no player reaches it through the lexical arm, and no excerpt quotes the block', async () => {
      for (const [who, headers] of [
        ['Alice (the addressed user)', asAlice()],
        ['Bob (not addressed)', asBob()],
      ] as const) {
        const results = await search(ALICE_NEEDLE, headers)
        for (const r of results) {
          expect(r.arms, `${who} matched a secret-only term lexically on ${r.slug}`).not.toContain(
            'lexical',
          )
          expect(r.snippet ?? '', `${who} got the secret quoted back on ${r.slug}`).not.toContain(
            ALICE_NEEDLE,
          )
        }
      }
    })

    it('the DM finds it, through the lexical arm, with the block quoted', async () => {
      const results = await search(ALICE_NEEDLE, asDm())
      const hit = results.find((r) => r.slug === entitySlug)
      expect(hit, 'the Narrator lost their own search').toBeDefined()
      expect(hit!.arms).toContain('lexical')
      expect(hit!.snippet).toContain(ALICE_NEEDLE)
    })
  })
})
