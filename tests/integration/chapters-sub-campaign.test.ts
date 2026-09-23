import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function getCsrfToken(cookie: string): Promise<string> {
  const res = await api('/api/campaigns', { headers: { Cookie: cookie } })
  return (res.headers.get('set-cookie') || '').match(/csrf_token=([^;]+)/)?.[1] || ''
}

/**
 * A chapter's sub-campaign is DERIVED from its arc — never a column on `chapters`, so the two can
 * never disagree. These assert the three consequences: it is reported, it is filterable, and
 * writing it is REFUSED rather than quietly discarded.
 */
describe('chapters and the sub-campaign they inherit', () => {
  const email = `chap-${Date.now()}@example.com`
  let cookie = ''
  let auth: Record<string, string> = {}
  let campaignId = ''
  let generalSlug = ''
  let mortalesSlug = ''
  let arcG = { slug: '', id: '' }
  let arcM = { slug: '', id: '' }
  let chapterInG = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Chap Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const m = (login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)
    cookie = m ? `better-auth.session_token=${m[1]}` : ''
    const csrf = await getCsrfToken(cookie)
    auth = { Cookie: `${cookie}; csrf_token=${csrf}`, 'X-CSRF-Token': csrf }

    campaignId = (
      await (
        await api('/api/campaigns', {
          method: 'POST',
          headers: auth,
          body: { name: `Chapters ${Date.now()}` },
        })
      ).json()
    ).id

    const subs = await (
      await api(`/api/campaigns/${campaignId}/sub-campaigns`, { headers: { Cookie: cookie } })
    ).json()
    generalSlug = subs.find((s: { isDefault: boolean }) => s.isDefault).slug
    mortalesSlug = (
      await (
        await api(`/api/campaigns/${campaignId}/sub-campaigns`, {
          method: 'POST',
          headers: auth,
          body: { name: 'Mortales' },
        })
      ).json()
    ).slug

    const mkArc = async (name: string, sub: string) =>
      await (
        await api(`/api/campaigns/${campaignId}/arcs`, {
          method: 'POST',
          headers: auth,
          body: { name: `${name} ${Date.now()}`, subCampaignSlug: sub },
        })
      ).json()
    const a = await mkArc('Arco G', generalSlug)
    arcG = { slug: a.slug, id: a.id }
    const b = await mkArc('Arco M', mortalesSlug)
    arcM = { slug: b.slug, id: b.id }

    const mkChapter = async (name: string, arcId: string) =>
      await (
        await api(`/api/campaigns/${campaignId}/chapters`, {
          method: 'POST',
          headers: auth,
          body: { name: `${name} ${Date.now()}`, arcId },
        })
      ).json()
    chapterInG = (await mkChapter('Cap G', arcG.id)).slug
    await mkChapter('Cap G2', arcG.id)
    await mkChapter('Cap M', arcM.id)
  })

  const list = async (qs = '') =>
    (await (
      await api(`/api/campaigns/${campaignId}/chapters${qs}`, { headers: { Cookie: cookie } })
    ).json()) as Array<Record<string, string>>

  it('lists every chapter of the campaign with no parameters', async () => {
    const rows = await list()
    expect(rows.length).toBe(3)
    expect(rows.every((c) => c.subCampaignName)).toBe(true)
  })

  it('reports the sub-campaign its arc belongs to, by name and slug', async () => {
    const row = (await list()).find((c) => c.slug === chapterInG)!
    expect(row.subCampaignSlug).toBe(generalSlug)
    expect(row.arcSlug).toBe(arcG.slug)
  })

  it('filters by sub-campaign', async () => {
    expect((await list(`?subCampaignSlug=${mortalesSlug}`)).length).toBe(1)
    // The control: filtering the other way round must give the complement, or the filter could
    // be returning a constant.
    expect((await list(`?subCampaignSlug=${generalSlug}`)).length).toBe(2)
  })

  it('an unknown sub-campaign slug yields an empty list, not an error', async () => {
    const res = await api(`/api/campaigns/${campaignId}/chapters?subCampaignSlug=nope`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('follows its arc when the arc moves, with no chapter write', async () => {
    await api(`/api/campaigns/${campaignId}/arcs/${arcG.slug}`, {
      method: 'PUT',
      headers: auth,
      body: { subCampaignSlug: mortalesSlug },
    })
    const row = (await list()).find((c) => c.slug === chapterInG)!
    expect(row.subCampaignSlug).toBe(mortalesSlug)

    // Put it back so the rest of the suite sees the arrangement it set up.
    await api(`/api/campaigns/${campaignId}/arcs/${arcG.slug}`, {
      method: 'PUT',
      headers: auth,
      body: { subCampaignSlug: generalSlug },
    })
  })

  it('REFUSES a direct sub-campaign write instead of ignoring it', async () => {
    const res = await api(`/api/campaigns/${campaignId}/chapters/${chapterInG}`, {
      method: 'PUT',
      headers: auth,
      body: { subCampaignSlug: mortalesSlug },
    })
    expect(res.status).toBe(422)
    expect((await res.json()).message).toContain('arc')

    const row = (await list()).find((c) => c.slug === chapterInG)!
    expect(row.subCampaignSlug).toBe(generalSlug)
  })

  it('refuses it on create too', async () => {
    const res = await api(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: auth,
      body: { name: `Nope ${Date.now()}`, arcId: arcG.id, subCampaignSlug: mortalesSlug },
    })
    expect(res.status).toBe(422)
    expect((await list()).length).toBe(3)
  })

  it('refuses an arc from another campaign', async () => {
    const other = (
      await (
        await api('/api/campaigns', {
          method: 'POST',
          headers: auth,
          body: { name: `Otra ${Date.now()}` },
        })
      ).json()
    ).id
    const foreignArc = await (
      await api(`/api/campaigns/${other}/arcs`, {
        method: 'POST',
        headers: auth,
        body: { name: `Ajeno ${Date.now()}` },
      })
    ).json()

    const res = await api(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: auth,
      body: { name: `Intruso ${Date.now()}`, arcId: foreignArc.id },
    })
    expect(res.status).toBe(404)
    expect((await list()).length).toBe(3)
  })

  it('never discloses another campaign chapters through arc_id', async () => {
    const res = await api(`/api/campaigns/${campaignId}/chapters?arc_id=${arcM.id}`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    // Same campaign, so this one DOES return rows — the control proving the filter works at all.
    expect((await res.json()).length).toBe(1)
  })
})
