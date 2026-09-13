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

  describe('the campaign search endpoint never surfaces it, not even to Alice', () => {
    // `/search` returns `{ results, query }`, each result keyed by the entity's DB id, with the
    // human-readable `slug` alongside it — search by slug, not by the (unrelated) `entityId`.
    it('Alice cannot find it by searching for the needle', async () => {
      const res = await api(
        `/api/campaigns/${campaignId}/search?q=${encodeURIComponent(ALICE_NEEDLE)}`,
        { headers: asAlice() },
      )
      expect(res.status).toBe(200)
      const { results } = (await res.json()) as { results: Array<{ slug?: string }> }
      expect(results.some((r) => r.slug === entitySlug)).toBe(false)
    })

    it('the DM can find it', async () => {
      const res = await api(
        `/api/campaigns/${campaignId}/search?q=${encodeURIComponent(ALICE_NEEDLE)}`,
        { headers: asDm() },
      )
      expect(res.status).toBe(200)
      const { results } = (await res.json()) as { results: Array<{ slug?: string }> }
      expect(results.some((r) => r.slug === entitySlug)).toBe(true)
    })
  })
})
