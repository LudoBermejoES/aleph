import { describe, it, expect, beforeAll } from 'vitest'
import { apiRaw, signUpAndLogin, signUpAndGetApiKey } from './helpers'

/**
 * Server-side half of the `cli-arc-support` change:
 * slug-addressed arc/chapter assignment on session write, the `arcSlug` list filter,
 * and the arc/chapter name projection.
 * Acceptance criteria: openspec/changes/cli-arc-support/specs/session-management/spec.md
 */

type Row = Record<string, unknown>

describe('Session arc/chapter slug assignment (integration)', () => {
  const ts = Date.now()
  // Chapter names are unique per run on purpose. `chapters` has no campaign column, so a
  // fixed name like "The Market" leaves rows behind that shadow every other suite's
  // same-named chapter in the shared dev DB.
  const MARKET = `The Market ${ts}`
  const PROLOGUE = `Prologue ${ts}`
  let apiKey = ''
  // Campaign A is the campaign under test; campaign B exists only to prove scoping.
  let campA = ''
  let campB = ''
  const arc: Record<string, { id: string; slug: string }> = {}
  const chapter: Record<string, { id: string; slug: string }> = {}

  function auth(key = apiKey) {
    return { 'X-API-Key': key }
  }

  async function createCampaign(name: string) {
    const res = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: auth(),
      body: { name },
    })
    return (await res.json()).id as string
  }

  async function createArc(campaignId: string, name: string) {
    const res = await apiRaw(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: auth(),
      body: { name },
    })
    expect(res.status).toBe(200)
    return (await res.json()) as { id: string; name: string; slug: string }
  }

  async function createChapter(campaignId: string, name: string, arcId: string) {
    const res = await apiRaw(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: auth(),
      body: { name, arcId },
    })
    expect(res.status).toBe(200)
    return (await res.json()) as { id: string; name: string; slug: string }
  }

  async function createSession(campaignId: string, body: Row = {}) {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: auth(),
      body: { title: `S-${ts}-${Math.random().toString(36).slice(2, 10)}`, ...body },
    })
    return { status: res.status, body: (await res.json()) as Row }
  }

  async function listSessions(campaignId: string, qs = '') {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions${qs}`, { headers: auth() })
    const body = await res.json()
    return { status: res.status, body }
  }

  async function sessionRow(campaignId: string, id: string) {
    const { body } = await listSessions(campaignId, '?pageSize=0')
    const list = (body.data ?? body) as Row[]
    return list.find((s) => s.id === id) as Row
  }

  async function putSession(campaignId: string, slug: string, body: Row, key = apiKey) {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${slug}`, {
      method: 'PUT',
      headers: auth(key),
      body,
    })
    let json: Row = {}
    try {
      json = (await res.json()) as Row
    } catch {
      /* empty body */
    }
    return { status: res.status, body: json }
  }

  beforeAll(async () => {
    apiKey = await signUpAndGetApiKey(`session-arc-slug-${ts}@example.com`)
    campA = await createCampaign(`Session Arc Slug A ${ts}`)
    campB = await createCampaign(`Session Arc Slug B ${ts}`)

    // Campaign B first, so a campaign-blind `chapters.slug` lookup would hit B's rows
    // first and shadow campaign A's same-slug chapter.
    arc.bOnly = await createArc(campB, 'Only In B')
    chapter.bPrologue = await createChapter(campB, PROLOGUE, arc.bOnly!.id)
    chapter.bMarketless = await createChapter(campB, `Only B Chapter ${ts}`, arc.bOnly!.id)

    arc.actI = await createArc(campA, 'Act I')
    arc.actII = await createArc(campA, 'Act II')
    chapter.theMarket = await createChapter(campA, MARKET, arc.actI!.id)
    chapter.aPrologue = await createChapter(campA, PROLOGUE, arc.actII!.id)
  })

  it('arc POST returns the slug (was undefined before this change)', () => {
    expect(arc.actI!.slug).toBe('act-i')
    expect(arc.actII!.slug).toBe('act-ii')
  })

  it('chapter POST returns the slug', () => {
    expect(chapter.theMarket!.slug).toBe(`the-market-${ts}`)
  })

  it('assigns an arc by slug', async () => {
    const s = await createSession(campA)
    const put = await putSession(campA, s.body.slug as string, { arcSlug: 'act-i' })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actI!.id)
  })

  it('assigning a chapter derives the arc', async () => {
    const s = await createSession(campA)
    const put = await putSession(campA, s.body.slug as string, {
      chapterSlug: chapter.theMarket!.slug,
    })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.chapterId).toBe(chapter.theMarket!.id)
    expect(row.arcId).toBe(arc.actI!.id)
  })

  it('applies a consistent arc + chapter pair', async () => {
    const s = await createSession(campA)
    const put = await putSession(campA, s.body.slug as string, {
      arcSlug: 'act-i',
      chapterSlug: chapter.theMarket!.slug,
    })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actI!.id)
    expect(row.chapterId).toBe(chapter.theMarket!.id)
  })

  it('rejects a chapter from a different arc with 422 naming both slugs', async () => {
    const s = await createSession(campA, { arcId: arc.actI!.id })
    const put = await putSession(campA, s.body.slug as string, {
      arcSlug: 'act-ii',
      chapterSlug: chapter.theMarket!.slug,
    })
    expect(put.status).toBe(422)
    expect(String(put.body.message)).toContain(chapter.theMarket!.slug)
    expect(String(put.body.message)).toContain('act-ii')
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actI!.id) // unchanged
    expect(row.chapterId).toBeNull()
  })

  it('clearing the arc also clears the chapter', async () => {
    const s = await createSession(campA, {
      arcId: arc.actI!.id,
      chapterId: chapter.theMarket!.id,
    })
    const put = await putSession(campA, s.body.slug as string, { arcSlug: '' })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBeNull()
    expect(row.chapterId).toBeNull()
  })

  it('clearing the chapter leaves the arc intact', async () => {
    const s = await createSession(campA, {
      arcId: arc.actI!.id,
      chapterId: chapter.theMarket!.id,
    })
    const put = await putSession(campA, s.body.slug as string, { chapterSlug: '' })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actI!.id)
    expect(row.chapterId).toBeNull()
  })

  it('moving a session to another arc clears a now-inconsistent chapter', async () => {
    const s = await createSession(campA, {
      arcId: arc.actI!.id,
      chapterId: chapter.theMarket!.id,
    })
    const put = await putSession(campA, s.body.slug as string, { arcSlug: 'act-ii' })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actII!.id)
    expect(row.chapterId).toBeNull()
  })

  it('re-stating the arc the chapter already belongs to leaves the chapter alone', async () => {
    const s = await createSession(campA, {
      arcId: arc.actI!.id,
      chapterId: chapter.theMarket!.id,
    })
    const put = await putSession(campA, s.body.slug as string, { arcSlug: 'act-i' })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actI!.id)
    expect(row.chapterId).toBe(chapter.theMarket!.id)
  })

  it('the cascade sees a chapterId sent in the same request, not just the stored one', async () => {
    const s = await createSession(campA)
    // chapterId (act-i's chapter) and arcSlug (act-ii) in one request: the chapter the
    // caller is trying to set is itself inconsistent with the named arc, so it goes.
    const put = await putSession(campA, s.body.slug as string, {
      arcSlug: 'act-ii',
      chapterId: chapter.theMarket!.id,
    })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actII!.id)
    expect(row.chapterId).toBeNull()

    // ...and a chapterId consistent with the named arc survives.
    const s2 = await createSession(campA)
    const put2 = await putSession(campA, s2.body.slug as string, {
      arcSlug: 'act-i',
      chapterId: chapter.theMarket!.id,
    })
    expect(put2.status).toBe(200)
    const row2 = await sessionRow(campA, s2.body.id as string)
    expect(row2.arcId).toBe(arc.actI!.id)
    expect(row2.chapterId).toBe(chapter.theMarket!.id)
  })

  it('null arcSlug clears both, like the empty string', async () => {
    const s = await createSession(campA, {
      arcId: arc.actI!.id,
      chapterId: chapter.theMarket!.id,
    })
    const put = await putSession(campA, s.body.slug as string, { arcSlug: null })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBeNull()
    expect(row.chapterId).toBeNull()
  })

  it('clearing the arc while naming a chapter is rejected with 422', async () => {
    const s = await createSession(campA, { arcId: arc.actI!.id })
    const put = await putSession(campA, s.body.slug as string, {
      arcSlug: '',
      chapterSlug: chapter.theMarket!.slug,
    })
    expect(put.status).toBe(422)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actI!.id)
  })

  it('unknown arc slug returns 404 quoting the slug, session unmodified', async () => {
    const s = await createSession(campA, { arcId: arc.actI!.id })
    const before = await sessionRow(campA, s.body.id as string)
    const put = await putSession(campA, s.body.slug as string, {
      arcSlug: 'nonexistent',
      summary: 'should not be written',
    })
    expect(put.status).toBe(404)
    expect(String(put.body.message)).toContain('nonexistent')
    const after = await sessionRow(campA, s.body.id as string)
    expect(after.arcId).toBe(before.arcId)
    expect(after.summary).toBe(before.summary)
    expect(after.updatedAt).toBe(before.updatedAt)
  })

  it('arc slug from another campaign does not resolve', async () => {
    const s = await createSession(campA)
    const put = await putSession(campA, s.body.slug as string, { arcSlug: arc.bOnly!.slug })
    expect(put.status).toBe(404)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBeNull()
  })

  it('chapter slug that exists only in another campaign does not resolve', async () => {
    const s = await createSession(campA)
    const put = await putSession(campA, s.body.slug as string, {
      chapterSlug: chapter.bMarketless!.slug,
    })
    expect(put.status).toBe(404)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.chapterId).toBeNull()
  })

  it('a same-slug chapter in another campaign does not shadow this campaign', async () => {
    const s = await createSession(campA)
    const put = await putSession(campA, s.body.slug as string, {
      chapterSlug: chapter.aPrologue!.slug,
    })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.chapterId).toBe(chapter.aPrologue!.id)
    expect(row.arcId).toBe(arc.actII!.id)
  })

  it('ambiguous arc slug returns 409 naming slug and match count', async () => {
    const twinCampaign = await createCampaign(`Twin Arcs ${ts}`)
    const t1 = await createArc(twinCampaign, 'Twin Arc')
    const t2 = await createArc(twinCampaign, 'Twin Arc')
    expect(t1.slug).toBe(t2.slug)

    const s = await createSession(twinCampaign)
    const put = await putSession(twinCampaign, s.body.slug as string, { arcSlug: 'twin-arc' })
    expect(put.status).toBe(409)
    expect(String(put.body.message)).toContain('twin-arc')
    expect(String(put.body.message)).toContain('2')
    const row = await sessionRow(twinCampaign, s.body.id as string)
    expect(row.arcId).toBeNull()
  })

  it('ambiguous chapter slug is 409 alone and resolvable with arcSlug', async () => {
    const dupCampaign = await createCampaign(`Dup Chapters ${ts}`)
    const one = await createArc(dupCampaign, 'Arc One')
    const two = await createArc(dupCampaign, 'Arc Two')
    const dupName = `Prologue Dup ${ts}`
    const chOne = await createChapter(dupCampaign, dupName, one.id)
    const chTwo = await createChapter(dupCampaign, dupName, two.id)
    expect(chOne.slug).toBe(chTwo.slug)

    const s = await createSession(dupCampaign)
    const ambiguous = await putSession(dupCampaign, s.body.slug as string, {
      chapterSlug: chOne.slug,
    })
    expect(ambiguous.status).toBe(409)
    expect(String(ambiguous.body.message)).toContain(chOne.slug)

    const narrowed = await putSession(dupCampaign, s.body.slug as string, {
      arcSlug: 'arc-one',
      chapterSlug: chOne.slug,
    })
    expect(narrowed.status).toBe(200)
    const row = await sessionRow(dupCampaign, s.body.id as string)
    expect(row.chapterId).toBe(chOne.id)
    expect(row.arcId).toBe(one.id)
  })

  it('id-based assignment keeps working unchanged', async () => {
    const s = await createSession(campA)
    const put = await putSession(campA, s.body.slug as string, {
      arcId: arc.actII!.id,
      chapterId: chapter.aPrologue!.id,
    })
    expect(put.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actII!.id)
    expect(row.chapterId).toBe(chapter.aPrologue!.id)
  })

  it('session creation accepts arcSlug', async () => {
    const s = await createSession(campA, { arcSlug: 'act-i' })
    expect(s.status).toBe(200)
    expect(s.body.arcId).toBe(arc.actI!.id)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actI!.id)
  })

  it('session creation accepts chapterSlug and derives the arc', async () => {
    const s = await createSession(campA, { chapterSlug: chapter.theMarket!.slug })
    expect(s.status).toBe(200)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBe(arc.actI!.id)
    expect(row.chapterId).toBe(chapter.theMarket!.id)
  })

  it('session creation with an unknown arcSlug returns 404', async () => {
    const s = await createSession(campA, { arcSlug: 'no-such-arc' })
    expect(s.status).toBe(404)
    expect(String(s.body.message)).toContain('no-such-arc')
  })

  it('player role cannot assign an arc (403)', async () => {
    const playerEmail = `session-arc-player-${ts}@example.com`
    const playerKey = await signUpAndGetApiKey(playerEmail)
    const { cookie } = await signUpAndLogin(playerEmail)
    const inviteRes = await apiRaw(`/api/campaigns/${campA}/invite`, {
      method: 'POST',
      headers: auth(),
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await apiRaw(`/api/campaigns/${campA}/join`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { token: invite.token },
    })

    const s = await createSession(campA)
    const put = await putSession(campA, s.body.slug as string, { arcSlug: 'act-i' }, playerKey)
    expect(put.status).toBe(403)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBeNull()
  })

  it('unauthenticated request cannot assign an arc (401)', async () => {
    const s = await createSession(campA)
    const res = await apiRaw(`/api/campaigns/${campA}/sessions/${s.body.slug}`, {
      method: 'PUT',
      body: { arcSlug: 'act-i' },
    })
    expect(res.status).toBe(401)
    const row = await sessionRow(campA, s.body.id as string)
    expect(row.arcId).toBeNull()
  })
})

describe('Session list arc filter and name projection (integration)', () => {
  const ts = Date.now()
  const MARKET_LIST = `The Market List ${ts}`
  let apiKey = ''
  let campaignId = ''
  let filterArc = { id: '', slug: '' }
  let otherArc = { id: '', slug: '' }
  let namedChapter = { id: '', slug: '' }
  let subCampaignSlug = ''
  const inArcIds: string[] = []
  let unassignedId = ''
  let unassignedSlug = ''
  let tripleMatchId = ''
  let tripleMatchSlug = ''

  function auth(key = apiKey) {
    return { 'X-API-Key': key }
  }

  async function listSessions(qs = '') {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions${qs}`, { headers: auth() })
    return { status: res.status, body: (await res.json()) as Row }
  }

  beforeAll(async () => {
    apiKey = await signUpAndGetApiKey(`session-arc-list-${ts}@example.com`)
    const campRes = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: auth(),
      body: { name: `Session Arc List ${ts}` },
    })
    campaignId = (await campRes.json()).id

    const mk = async (path: string, body: Row) => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/${path}`, {
        method: 'POST',
        headers: auth(),
        body,
      })
      expect(res.status).toBe(200)
      return (await res.json()) as Row
    }

    const a = await mk('arcs', { name: 'Act I' })
    filterArc = { id: a.id as string, slug: a.slug as string }
    const b = await mk('arcs', { name: 'Act II' })
    otherArc = { id: b.id as string, slug: b.slug as string }
    const ch = await mk('chapters', { name: MARKET_LIST, arcId: filterArc.id })
    namedChapter = { id: ch.id as string, slug: ch.slug as string }
    const grp = await mk('sub-campaigns', { name: 'Main Table' })
    subCampaignSlug = grp.slug as string

    // 3 sessions in Act I (one of them also in a sub-campaign + completed + chaptered), 2 elsewhere.
    for (let i = 0; i < 3; i++) {
      const extra =
        i === 0
          ? { subCampaignSlug, status: 'completed', chapterSlug: namedChapter.slug }
          : { status: 'planned' }
      const s = await mk('sessions', { title: `In Arc ${i} ${ts}`, arcSlug: 'act-i', ...extra })
      inArcIds.push(s.id as string)
      if (i === 0) {
        tripleMatchId = s.id as string
        tripleMatchSlug = s.slug as string
      }
    }
    const other = await mk('sessions', { title: `Other Arc ${ts}`, arcSlug: otherArc.slug })
    expect(other.arcId).toBe(otherArc.id)
    const none = await mk('sessions', { title: `No Arc ${ts}` })
    unassignedId = none.id as string
    unassignedSlug = none.slug as string
  })

  it('filters sessions by arc slug', async () => {
    const { status, body } = await listSessions('?arcSlug=act-i&pageSize=0')
    expect(status).toBe(200)
    const list = (body as unknown as Row[]).map((s) => s.id)
    expect(list.sort()).toEqual([...inArcIds].sort())
  })

  it('filtered total reflects the filter, not the campaign total', async () => {
    const all = await listSessions('?page=1&pageSize=10')
    expect((all.body.meta as Row).total).toBe(5)

    const { body } = await listSessions('?arcSlug=act-i&page=1&pageSize=2')
    const meta = body.meta as Row
    expect(meta.total).toBe(3)
    expect(meta.totalPages).toBe(2)
    expect((body.data as Row[]).length).toBe(2)
  })

  it('unknown arc slug yields an empty page, not 404', async () => {
    const { status, body } = await listSessions('?arcSlug=nonexistent')
    expect(status).toBe(200)
    expect(body.data).toEqual([])
    expect((body.meta as Row).total).toBe(0)
  })

  it('arc filter composes with the sub-campaign and status filters', async () => {
    const { body } = await listSessions(
      `?arcSlug=act-i&subCampaignSlug=${subCampaignSlug}&status=completed`,
    )
    const data = body.data as Row[]
    expect(data.length).toBe(1)
    expect(data[0]!.id).toBe(tripleMatchId)
  })

  it('response carries arc and chapter names', async () => {
    const { body } = await listSessions('?pageSize=0')
    const row = (body as unknown as Row[]).find((s) => s.id === tripleMatchId)!
    expect(row.arcName).toBe('Act I')
    expect(row.chapterName).toBe(MARKET_LIST)
    expect(row.subCampaignName).toBe('Main Table')
  })

  it('unassigned sessions report null names', async () => {
    const { status, body } = await listSessions('?pageSize=0')
    expect(status).toBe(200)
    const row = (body as unknown as Row[]).find((s) => s.id === unassignedId)!
    expect(row.arcId).toBeNull()
    expect(row.arcName).toBeNull()
    expect(row.chapterName).toBeNull()
  })

  it('ambiguous arc slug on the read path matches every arc sharing it', async () => {
    // design.md decision 4: the read path stays permissive where the write path 409s —
    // an over-matching filter is visible in the output.
    const mk = async (path: string, body: Row) => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/${path}`, {
        method: 'POST',
        headers: auth(),
        body,
      })
      expect(res.status).toBe(200)
      return (await res.json()) as Row
    }
    const twinA = await mk('arcs', { name: 'Twin Read Arc' })
    const twinB = await mk('arcs', { name: 'Twin Read Arc' })
    expect(twinA.slug).toBe(twinB.slug)
    const sA = await mk('sessions', { title: `Twin A ${ts}`, arcId: twinA.id })
    const sB = await mk('sessions', { title: `Twin B ${ts}`, arcId: twinB.id })

    const { body } = await listSessions(`?arcSlug=${twinA.slug}&pageSize=0`)
    const ids = (body as unknown as Row[]).map((s) => s.id)
    expect(ids.sort()).toEqual([sA.id, sB.id].sort())
  })

  it('single-session GET reports arc and chapter names too', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${tripleMatchSlug}`, {
      headers: auth(),
    })
    expect(res.status).toBe(200)
    const s = (await res.json()) as Row
    expect(s.arcName).toBe('Act I')
    expect(s.chapterName).toBe(MARKET_LIST)
    // The list and single-session responses must agree on which name fields exist.
    expect(s.subCampaignName).toBe('Main Table')
    // `arcSlug` rides along so a client can link to the arc without a second request —
    // the session page's arc badge is a link and depends on it.
    expect(s.arcSlug).toBe('act-i')
  })

  it('single-session GET reports null names when unassigned', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions/${unassignedSlug}`, {
      headers: auth(),
    })
    expect(res.status).toBe(200)
    const s = (await res.json()) as Row
    expect(s.arcId).toBeNull()
    expect(s.arcName).toBeNull()
    expect(s.arcSlug).toBeNull()
    expect(s.chapterName).toBeNull()
  })

  it('unauthenticated arc-filtered list is rejected', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/sessions?arcSlug=act-i`)
    expect(res.status).toBe(401)
  })
})
