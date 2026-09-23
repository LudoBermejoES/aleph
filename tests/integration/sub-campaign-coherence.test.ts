import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function getCsrfToken(sessionCookie: string): Promise<string> {
  const res = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = res.headers.get('set-cookie') || ''
  return setCookie.match(/csrf_token=([^;]+)/)?.[1] || ''
}

/**
 * Coherence between a session and the arc it points at.
 *
 * Written against the RULE, not the implementation: the rule is that a session and its arc name
 * the same storyline. The audit is the safety net for rows that predate the rule, so its own
 * gate is that it REPORTS and does not write — an audit that quietly repaired would destroy the
 * evidence of what the Narrator meant.
 */
describe('sub-campaign coherence: a session and its arc', () => {
  const email = `coh-${Date.now()}@example.com`
  let cookie = ''
  let csrf = ''
  let auth: Record<string, string> = {}
  let campaignId = ''
  let mortalesSlug = ''
  let generalSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Coherence Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const m = (login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)
    cookie = m ? `better-auth.session_token=${m[1]}` : ''
    csrf = await getCsrfToken(cookie)
    auth = { Cookie: `${cookie}; csrf_token=${csrf}`, 'X-CSRF-Token': csrf }

    const campaign = await (
      await api('/api/campaigns', {
        method: 'POST',
        headers: auth,
        body: { name: `Coherence ${Date.now()}` },
      })
    ).json()
    campaignId = campaign.id

    const subs = await (
      await api(`/api/campaigns/${campaignId}/sub-campaigns`, { headers: { Cookie: cookie } })
    ).json()
    generalSlug = subs.find((s: { isDefault: boolean }) => s.isDefault).slug

    const mortales = await (
      await api(`/api/campaigns/${campaignId}/sub-campaigns`, {
        method: 'POST',
        headers: auth,
        body: { name: 'Mortales' },
      })
    ).json()
    mortalesSlug = mortales.slug
  })

  async function makeSession(subCampaignSlug: string, extra: Record<string, unknown> = {}) {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: auth,
      body: { title: `S ${Date.now()}-${Math.random()}`, subCampaignSlug, ...extra },
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  }

  describe('the audit, over the real API', () => {
    // The "it finds an incoherent row" half lives in tests/unit/server/sub-campaign-audit.test.ts
    // and CANNOT live here: with the 422 and the arc-move cascade in place, no route can create
    // that state any more, so the setup would be impossible. What is worth asserting over HTTP is
    // the endpoint's shape, that it is read-only, and that a healthy campaign comes back clean.
    it('reports a coherent campaign as clean', async () => {
      const s = await makeSession(mortalesSlug)
      expect(s.status, JSON.stringify(s.body)).toBe(200)

      const res = await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const report = await res.json()
      expect(report.total).toBe(0)
      expect(report.incoherent).toEqual([])
    })

    // `?pageSize=0` answers with a BARE ARRAY here, not the `{data, meta}` envelope the paginated
    // form uses. Reading `.data` off it yields `undefined`, and `undefined` compared against
    // `undefined` would have made this pass while measuring nothing at all.
    async function sessionFingerprints(): Promise<string[]> {
      const body = await (
        await api(`/api/campaigns/${campaignId}/sessions?pageSize=0`, {
          headers: { Cookie: cookie },
        })
      ).json()
      const rows = (Array.isArray(body) ? body : body.data) as Array<{
        slug: string
        subCampaignName: string
        arcName: string | null
      }>
      expect(rows, 'the sessions list came back in neither known envelope').toBeInstanceOf(Array)
      return rows.map((s) => `${s.slug}|${s.subCampaignName}|${s.arcName}`).sort()
    }

    it('is read-only', async () => {
      const before = await sessionFingerprints()
      // The control: a snapshot of nothing would make the comparison below vacuous.
      expect(before.length, 'no sessions to compare').toBeGreaterThan(0)

      await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, { headers: { Cookie: cookie } })
      await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, { headers: { Cookie: cookie } })

      expect(await sessionFingerprints()).toEqual(before)
    })

    it('repairing a clean campaign is a no-op, not an error', async () => {
      const fix = await api(`/api/campaigns/${campaignId}/sub-campaigns/audit-fix`, {
        method: 'POST',
        headers: auth,
      })
      expect(fix.status).toBe(200)
      expect((await fix.json()).total).toBe(0)
    })
  })

  describe('a session and its arc must name the same storyline', () => {
    // Its OWN arcs. The audit block above MOVES `arcInGeneral` between sub-campaigns as its
    // fixture, so depending on it here would make these tests read state an earlier test mutated
    // — green or red depending on execution order, which is not a property worth asserting.
    let ownArcGeneral = ''
    let ownArcMortales = ''

    beforeAll(async () => {
      const mk = async (name: string, sub: string) =>
        (
          await (
            await api(`/api/campaigns/${campaignId}/arcs`, {
              method: 'POST',
              headers: auth,
              body: { name: `${name} ${Date.now()}`, subCampaignSlug: sub },
            })
          ).json()
        ).slug
      ownArcGeneral = await mk('Propio General', generalSlug)
      ownArcMortales = await mk('Propio Mortales', mortalesSlug)
    })

    it('refuses an arc from another sub-campaign, on update, without writing', async () => {
      const s = await makeSession(mortalesSlug)
      expect(s.status, JSON.stringify(s.body)).toBe(200)

      const res = await api(`/api/campaigns/${campaignId}/sessions/${s.body.slug}`, {
        method: 'PUT',
        headers: auth,
        body: { arcSlug: ownArcGeneral },
      })
      expect(res.status).toBe(422)
      const msg = (await res.json()).message as string
      // The message has to name BOTH, or the fix is not obvious from the error alone.
      expect(msg).toContain('Mortales')
      expect(msg).toContain('General')

      const after = await (
        await api(`/api/campaigns/${campaignId}/sessions/${s.body.slug}`, {
          headers: { Cookie: cookie },
        })
      ).json()
      expect(after.arcId ?? null, 'the refused request still wrote the arc').toBeNull()
    })

    it('refuses it on create, and creates nothing', async () => {
      const before = await (
        await api(`/api/campaigns/${campaignId}/sessions?pageSize=0`, {
          headers: { Cookie: cookie },
        })
      ).json()
      const count = (Array.isArray(before) ? before : before.data).length

      const res = await api(`/api/campaigns/${campaignId}/sessions`, {
        method: 'POST',
        headers: auth,
        body: {
          title: `Nope ${Date.now()}`,
          subCampaignSlug: mortalesSlug,
          arcSlug: ownArcGeneral,
        },
      })
      expect(res.status).toBe(422)

      const after = await (
        await api(`/api/campaigns/${campaignId}/sessions?pageSize=0`, {
          headers: { Cookie: cookie },
        })
      ).json()
      expect((Array.isArray(after) ? after : after.data).length).toBe(count)
    })

    it('ACCEPTS moving the session and assigning the arc in one request', async () => {
      // The case the naive implementation gets wrong: checking the arc against the STORED
      // sub-campaign refuses this, because of an intermediate state that never existed.
      const s = await makeSession(mortalesSlug)
      const res = await api(`/api/campaigns/${campaignId}/sessions/${s.body.slug}`, {
        method: 'PUT',
        headers: auth,
        body: { subCampaignSlug: generalSlug, arcSlug: ownArcGeneral },
      })
      expect(res.status, JSON.stringify(await res.clone().json())).toBe(200)

      const after = await (
        await api(`/api/campaigns/${campaignId}/sessions/${s.body.slug}`, {
          headers: { Cookie: cookie },
        })
      ).json()
      expect(after.subCampaignSlug).toBe(generalSlug)
      expect(after.arcName).toBeTruthy()
    })

    it('accepts an arc from the session own sub-campaign', async () => {
      const s = await makeSession(mortalesSlug)
      const res = await api(`/api/campaigns/${campaignId}/sessions/${s.body.slug}`, {
        method: 'PUT',
        headers: auth,
        body: { arcSlug: ownArcMortales },
      })
      expect(res.status, JSON.stringify(await res.clone().json())).toBe(200)
    })

    it('closes the raw arcId route too, not only the slug one', async () => {
      // `arcId` never reaches `resolveArcChapterSlugs`, so a check written only against `arcSlug`
      // leaves this wide open — and the invariant would be a fiction. Found by the audit fixture
      // still managing to build an incoherent row after the slug path was closed.
      const arcRow = await (
        await api(`/api/campaigns/${campaignId}/arcs`, {
          method: 'POST',
          headers: auth,
          body: { name: `Crudo ${Date.now()}`, subCampaignSlug: generalSlug },
        })
      ).json()
      const s = await makeSession(mortalesSlug)

      const res = await api(`/api/campaigns/${campaignId}/sessions/${s.body.slug}`, {
        method: 'PUT',
        headers: auth,
        body: { arcId: arcRow.id },
      })
      expect(res.status, 'the raw id form walked past the invariant').toBe(422)

      const after = await (
        await api(`/api/campaigns/${campaignId}/sessions/${s.body.slug}`, {
          headers: { Cookie: cookie },
        })
      ).json()
      expect(after.arcId ?? null).toBeNull()
    })

    it('a session with no arc can move freely', async () => {
      const s = await makeSession(generalSlug)
      const res = await api(`/api/campaigns/${campaignId}/sessions/${s.body.slug}`, {
        method: 'PUT',
        headers: auth,
        body: { subCampaignSlug: mortalesSlug },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('moving an arc carries its sessions', () => {
    it('moves them, reports the count, and leaves the campaign coherent', async () => {
      const arc = await (
        await api(`/api/campaigns/${campaignId}/arcs`, {
          method: 'POST',
          headers: auth,
          body: { name: `Arrastre ${Date.now()}`, subCampaignSlug: generalSlug },
        })
      ).json()

      for (let i = 0; i < 3; i++) {
        const s = await makeSession(generalSlug, { arcSlug: arc.slug })
        expect(s.status, JSON.stringify(s.body)).toBe(200)
      }

      const res = await api(`/api/campaigns/${campaignId}/arcs/${arc.slug}`, {
        method: 'PUT',
        headers: auth,
        body: { subCampaignSlug: mortalesSlug },
      })
      expect(res.status).toBe(200)
      expect((await res.json()).movedSessions).toBe(3)

      // The point of the cascade: the campaign stays coherent, which the audit is the judge of.
      const audit = await (
        await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, {
          headers: { Cookie: cookie },
        })
      ).json()
      expect(
        audit.incoherent.some((r: { arcSlug: string }) => r.arcSlug === arc.slug),
        'the move left its own sessions behind',
      ).toBe(false)
    })

    it('reports zero when the sub-campaign does not change', async () => {
      const arc = await (
        await api(`/api/campaigns/${campaignId}/arcs`, {
          method: 'POST',
          headers: auth,
          body: { name: `Quieto ${Date.now()}`, subCampaignSlug: generalSlug },
        })
      ).json()
      await makeSession(generalSlug, { arcSlug: arc.slug })

      const res = await api(`/api/campaigns/${campaignId}/arcs/${arc.slug}`, {
        method: 'PUT',
        headers: auth,
        body: { subCampaignSlug: generalSlug },
      })
      expect(res.status).toBe(200)
      expect((await res.json()).movedSessions).toBe(0)
    })

    it('renaming an arc moves nothing', async () => {
      const arc = await (
        await api(`/api/campaigns/${campaignId}/arcs`, {
          method: 'POST',
          headers: auth,
          body: { name: `Renombrable ${Date.now()}`, subCampaignSlug: generalSlug },
        })
      ).json()
      await makeSession(generalSlug, { arcSlug: arc.slug })

      const res = await api(`/api/campaigns/${campaignId}/arcs/${arc.slug}`, {
        method: 'PUT',
        headers: auth,
        body: { name: `Renombrado ${Date.now()}` },
      })
      expect(res.status).toBe(200)
      expect((await res.json()).movedSessions).toBe(0)
    })

    it('rejects a non-string subCampaignSlug instead of passing it to the query', async () => {
      const arc = await (
        await api(`/api/campaigns/${campaignId}/arcs`, {
          method: 'POST',
          headers: auth,
          body: { name: `Zod ${Date.now()}`, subCampaignSlug: generalSlug },
        })
      ).json()
      const res = await api(`/api/campaigns/${campaignId}/arcs/${arc.slug}`, {
        method: 'PUT',
        headers: auth,
        body: { subCampaignSlug: 123 },
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })
  })
})
