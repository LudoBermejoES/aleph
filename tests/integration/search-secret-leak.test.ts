import { describe, it, expect, beforeAll } from 'vitest'

/**
 * The search hole, end to end, against a REAL player account — not a `preview_as`
 * simulation, and not a unit test over the service.
 *
 * `tests/integration/secret-blocks-response-filter.test.ts` proves the response-wide filter
 * cleans every FIELD. It says nothing about search, and search is where the same content
 * escaped by a different door: `entities_fts.body` held raw markdown, and the returned
 * snippet is a 30-token window that usually contains no `:::secret` fence for a fence-
 * recognising filter to catch.
 *
 * Two things are asserted, and the second is the one that is easy to forget: the excerpt
 * must not quote the secret, AND there must be no result at all. A blank excerpt on a real
 * hit still answers "is the traitor named in this sheet?".
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

const ts = Date.now()
/** Deliberately far from either fence, so no snippet window can reach one. */
const PADDING = Array.from({ length: 60 }, (_, i) => `relleno${i}`).join(' ')

/**
 * The needles need to be unique per run (this database persists between runs), but their
 * unique suffix must NOT resemble the entity's name — and the obvious `${ts}` does.
 *
 * Measured: `sacrificaran1787575745198` and `Casa de los Aguirre 1787575745198` share
 * **11 character trigrams**, all of them from the timestamp, against a
 * `FUZZY_MIN_OVERLAP` of 2. So the trigram fuzzy fallback in `searchEntities` — which
 * indexes name/aliases ONLY, never the body, and is therefore incapable of leaking a
 * secret — matched the NAME and returned a hit for the secret word. Three of these tests
 * failed on that, and it looked exactly like the existence leak they exist to catch.
 * (It also made `the player still finds the sheet by its public text` pass for the wrong
 * reason: that hit was the same name match, not the public word.)
 *
 * So the same timestamp is spelled in letters here: still unique per run, zero trigram
 * overlap with a name whose unique part is digits — verified 0, not assumed. Do not put
 * the raw `${ts}` back into a needle.
 */
const TAG = String(ts)
  .split('')
  .map((d) => 'abcdefghij'[Number(d)])
  .join('')
const NEEDLE = `sacrificaran${TAG}`
const PUBLIC_NEEDLE = `soportales${TAG}`

const BODY = [
  `La casa tiene ${PUBLIC_NEEDLE} en el patio.`,
  '',
  ':::secret{.dm}',
  PADDING,
  `El ritual exige que tres inocentes se ${NEEDLE} antes del alba.`,
  PADDING,
  ':::',
  '',
  'Los vecinos no han entrado desde hace veinte años.',
].join('\n')

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

async function joinAs(campaignId: string, dmKey: string, role: string, email: string) {
  const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
    method: 'POST',
    headers: { 'X-API-Key': dmKey },
    body: { role },
  })
  const { token } = await inviteRes.json()
  const cookie = await signUpAndGetCookie(email, `${role} User`)
  const csrf = cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
  await api(`/api/campaigns/${campaignId}/join`, {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrf },
    body: { token },
  })
  return createApiKey(cookie, `searchleak-${role}-key-${ts}`)
}

interface SearchHit {
  entityId: string
  name: string
  snippet: string
  type: string
}

describe('search does not hand a Narrator-only word to a player', () => {
  let dmKey = ''
  let playerKey = ''
  let editorKey = ''
  let campaignId = ''
  let entityName = ''

  const search = async (key: string, q: string): Promise<SearchHit[]> => {
    const res = await api(`/api/campaigns/${campaignId}/search?q=${encodeURIComponent(q)}`, {
      headers: { 'X-API-Key': key },
    })
    expect(res.status).toBe(200)
    return (await res.json()).results as SearchHit[]
  }

  beforeAll(async () => {
    const dmCookie = await signUpAndGetCookie(`searchleak-dm-${ts}@example.com`, 'DM User')
    dmKey = await createApiKey(dmCookie, `searchleak-dm-key-${ts}`)

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Search Leak Test ${ts}` },
    })
    campaignId = (await campRes.json()).id

    playerKey = await joinAs(campaignId, dmKey, 'player', `searchleak-player-${ts}@example.com`)
    editorKey = await joinAs(campaignId, dmKey, 'editor', `searchleak-editor-${ts}@example.com`)

    entityName = `Casa de los Aguirre ${ts}`
    const entRes = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { type: 'location', name: entityName, content: BODY, visibility: 'members' },
    })
    expect(entRes.status).toBeLessThan(300)
  }, 60_000)

  /**
   * `toEqual([])` passes just as happily when the sheet was never indexed at all, so every
   * empty-result assertion is paired with a positive control on the SAME key: the public
   * word must still reach the same sheet. Empty then means "the secret is unreachable",
   * not "search is broken" or "the fixture never landed".
   */
  const expectSecretUnreachableButSheetFindable = async (key: string) => {
    expect(await search(key, NEEDLE)).toEqual([])
    expect((await search(key, PUBLIC_NEEDLE)).map((h) => h.name)).toContain(entityName)
  }

  it('a player searching the secret word gets NO result — not a scrubbed one', async () => {
    await expectSecretUnreachableButSheetFindable(playerKey)
  })

  it('an editor is below the line too, exactly as every other endpoint treats them', async () => {
    await expectSecretUnreachableButSheetFindable(editorKey)
  })

  it('no excerpt a player can obtain quotes the block', async () => {
    for (const q of [PUBLIC_NEEDLE, 'vecinos', entityName, 'ritual', 'inocentes']) {
      for (const hit of await search(playerKey, q)) {
        expect(hit.snippet, `leaked on query "${q}"`).not.toContain(NEEDLE)
        expect(hit.snippet, `leaked on query "${q}"`).not.toContain('inocentes')
        expect(hit.snippet, `leaked on query "${q}"`).not.toContain(':::secret')
      }
    }
  })

  it('the player still finds the sheet by its public text', async () => {
    const hits = await search(playerKey, PUBLIC_NEEDLE)
    expect(hits.map((h) => h.name)).toContain(entityName)
  })

  it('the Narrator keeps searching their own secrets, which is what a DM uses search for', async () => {
    const hits = await search(dmKey, NEEDLE)
    expect(hits.map((h) => h.name)).toContain(entityName)
  })

  it('a DM previewing as a player sees what the player sees', async () => {
    const previewSearch = async (q: string) => {
      const res = await api(
        `/api/campaigns/${campaignId}/search?q=${encodeURIComponent(q)}&preview_as=player`,
        { headers: { 'X-API-Key': dmKey } },
      )
      return (await res.json()).results as SearchHit[]
    }
    expect(await previewSearch(NEEDLE)).toEqual([])
    // Same positive control: the preview is scoped, not simply broken.
    expect((await previewSearch(PUBLIC_NEEDLE)).map((h) => h.name)).toContain(entityName)
  })

  it('Spanish morphology reaches the public text: an infinitive finds a conjugated form', async () => {
    const name = `Testigo ${ts}`
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: {
        type: 'note',
        name,
        content: `El testigo declaró que el sospechoso desapareció y nunca regresaron.`,
        visibility: 'members',
      },
    })
    const hits = await search(playerKey, 'declarar')
    expect(hits.map((h) => h.name)).toContain(name)
  })
})
