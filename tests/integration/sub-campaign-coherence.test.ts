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
  let arcInGeneral = ''

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

    const arc = await (
      await api(`/api/campaigns/${campaignId}/arcs`, {
        method: 'POST',
        headers: auth,
        body: { name: 'Acto II', subCampaignSlug: generalSlug },
      })
    ).json()
    arcInGeneral = arc.slug
  })

  async function makeSession(subCampaignSlug: string, extra: Record<string, unknown> = {}) {
    const res = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: auth,
      body: { title: `S ${Date.now()}-${Math.random()}`, subCampaignSlug, ...extra },
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  }

  describe('the audit reports and changes nothing', () => {
    it('finds a session whose arc is in another sub-campaign', async () => {
      // Manufactured the only way the product still allows: create coherent, then move the ARC,
      // which today leaves its sessions behind. That is the very gap being closed.
      const s = await makeSession(generalSlug, { arcSlug: arcInGeneral })
      expect(s.status, JSON.stringify(s.body)).toBe(200)
      expect(s.body.slug).toBeTruthy()

      await api(`/api/campaigns/${campaignId}/arcs/${arcInGeneral}`, {
        method: 'PUT',
        headers: auth,
        body: { subCampaignSlug: mortalesSlug },
      })

      const audit = await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, {
        headers: { Cookie: cookie },
      })
      expect(audit.status).toBe(200)
      const report = await audit.json()

      const hit = report.incoherent.find(
        (r: { sessionSlug: string }) => r.sessionSlug === s.body.slug,
      )
      expect(hit, 'the incoherent session was not reported').toBeDefined()
      expect(hit.sessionSubCampaignSlug).toBe(generalSlug)
      expect(hit.arcSubCampaignSlug).toBe(mortalesSlug)
      expect(hit.arcSlug).toBe(arcInGeneral)

      // The half that pins the comparison itself: a report that listed EVERY session with an arc
      // would satisfy the assertions above and be useless. A coherent session must be absent.
      const coherent = await makeSession(mortalesSlug, { arcSlug: arcInGeneral })
      expect(coherent.status, JSON.stringify(coherent.body)).toBe(200)
      const reread = await (
        await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, {
          headers: { Cookie: cookie },
        })
      ).json()
      expect(
        reread.incoherent.some(
          (r: { sessionSlug: string }) => r.sessionSlug === coherent.body.slug,
        ),
        'a session that agrees with its arc was reported as incoherent',
      ).toBe(false)
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

    it('does not modify the session it reports', async () => {
      const before = await sessionFingerprints()
      // The control: a snapshot of nothing would make the comparison below vacuous.
      expect(before.length, 'no sessions to compare').toBeGreaterThan(0)

      await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, { headers: { Cookie: cookie } })
      await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, { headers: { Cookie: cookie } })

      expect(await sessionFingerprints()).toEqual(before)
    })

    it('a session with no arc is never reported', async () => {
      const s = await makeSession(mortalesSlug)
      expect(s.status, JSON.stringify(s.body)).toBe(200)
      const report = await (
        await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, {
          headers: { Cookie: cookie },
        })
      ).json()
      expect(
        report.incoherent.some((r: { sessionSlug: string }) => r.sessionSlug === s.body.slug),
      ).toBe(false)
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

  describe('repair adopts the arc sub-campaign', () => {
    it('repairs, and a re-run reports nothing', async () => {
      const before = await (
        await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, {
          headers: { Cookie: cookie },
        })
      ).json()
      expect(before.total).toBeGreaterThan(0)

      const fix = await api(`/api/campaigns/${campaignId}/sub-campaigns/audit-fix`, {
        method: 'POST',
        headers: auth,
      })
      expect(fix.status).toBe(200)
      expect((await fix.json()).total).toBe(before.total)

      const after = await (
        await api(`/api/campaigns/${campaignId}/sub-campaigns/audit`, {
          headers: { Cookie: cookie },
        })
      ).json()
      expect(after.total, 'the repair left incoherent rows behind').toBe(0)
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
})
