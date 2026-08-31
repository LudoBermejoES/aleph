import { describe, it, expect, beforeAll } from 'vitest'
import { apiRaw, signUpAndGetApiKey } from './helpers'

/**
 * An `/api/**` path that matches no route must answer 404 with JSON.
 *
 * Before `server/api/[...].ts` existed it fell through to the SPA renderer and answered
 * **200 text/html** — measured twice, by two people, on
 * `PUT /api/campaigns/:id/sessions/:slug/xpp` (one letter off the real `/xp`). A URL with a
 * typo looked like it worked, which is how a test that only checks a status code ends up
 * green against the index skeleton.
 *
 * Half of these scenarios are about what the catch-all must NOT swallow: better-auth's own
 * `/api/auth/**` handler, the two websocket routes under `server/routes/api/`, and every real
 * endpoint. That is the part a reader cannot verify by looking at the handler.
 */
describe('unknown API routes', () => {
  let apiKey: string
  let campaignId: string
  let sessionSlug: string | null = null

  beforeAll(async () => {
    apiKey = await signUpAndGetApiKey(`unknown-route-${Date.now()}@test.com`)

    const created = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Unknown Route ${Date.now()}`, description: 'route matching fixture' },
    })
    campaignId = (await created.json()).id

    const session = await apiRaw(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'Route Fixture Session', date: '2026-01-01' },
    })
    if (session.ok) sessionSlug = (await session.json()).slug
  })

  it('answers 404 with JSON, not 200 HTML, for a path no route claims', async () => {
    const res = await apiRaw('/api/definitely-not-a-route', { headers: { 'X-API-Key': apiKey } })

    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = await res.json()
    expect(body.statusCode).toBe(404)
  })

  it('the one-letter typo that started this — /xpp instead of /xp — is a 404', async () => {
    expect(sessionSlug).toBeTruthy()
    const path = `/api/campaigns/${campaignId}/sessions/${sessionSlug}/xpp`

    const typo = await apiRaw(path, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { awards: [] },
    })
    expect(typo.status).toBe(404)
    expect(typo.headers.get('content-type')).toContain('application/json')

    // ...and the real route is unaffected, which is the whole point of the comparison.
    const real = await apiRaw(`/api/campaigns/${campaignId}/sessions/${sessionSlug}/xp`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { awards: [] },
    })
    expect(real.status).toBe(200)
    expect(real.headers.get('content-type')).toContain('application/json')
  })

  it('never answers text/html on an /api path, whatever the depth', async () => {
    const paths = [
      '/api/nope',
      '/api/campaigns/nope-nope',
      `/api/campaigns/${campaignId}/nope`,
      `/api/campaigns/${campaignId}/sessions/nope/nope`,
      '/api/a/b/c/d/e/f',
    ]
    for (const path of paths) {
      const res = await apiRaw(path, { headers: { 'X-API-Key': apiKey } })
      expect(
        res.headers.get('content-type'),
        `${path} answered ${res.status} ${res.headers.get('content-type')}`,
      ).not.toContain('text/html')
      expect(res.status, `${path} should not be 200`).not.toBe(200)
    }
  })

  it('does not shadow better-auth’s own catch-all', async () => {
    // A route better-auth really serves still answers it...
    const real = await apiRaw('/api/auth/get-session')
    expect(real.status).toBe(200)

    // ...and an unknown path UNDER /api/auth is answered by better-auth, not by this handler,
    // so it carries no `Unknown API route` message.
    const unknown = await apiRaw('/api/auth/definitely-not-a-better-auth-route')
    expect(unknown.status).toBe(404)
    const text = await unknown.text()
    expect(text).not.toContain('Unknown API route')
    expect(text).not.toContain('<!DOCTYPE')
  })

  it('does not shadow the websocket routes under server/routes/api', async () => {
    // The API key is load-bearing here, not decoration: `01.auth.ts` answers 401 to an
    // anonymous /api request BEFORE routing, so an unauthenticated probe of these paths
    // would pass `not.toBe(404)` even with the routes deleted. Mutation-tested exactly that
    // way — removing server/routes/api/ws.ts left the first draft of this test green.
    // Authenticated, a non-upgrade GET reaches crossws and comes back 426 Upgrade Required.
    const ws = await apiRaw('/api/ws', { headers: { 'X-API-Key': apiKey } })
    expect(ws.status).toBe(426)

    const tldraw = await apiRaw('/api/tldraw-sync/some-diagram-id', {
      headers: { 'X-API-Key': apiKey },
    })
    expect(tldraw.status).toBe(426)
  })

  it('does not shadow real endpoints', async () => {
    for (const path of ['/api/health', '/api/me', '/api/campaigns', '/api/apikeys']) {
      const res = await apiRaw(path, { headers: { 'X-API-Key': apiKey } })
      expect(res.status, `${path} answered ${res.status}`).toBe(200)
      expect(res.headers.get('content-type')).toContain('application/json')
    }
  })

  it('still answers 401 — not 404 — to an unauthenticated caller, so route existence stays private', async () => {
    const unknown = await apiRaw('/api/definitely-not-a-route')
    expect(unknown.status).toBe(401)

    const known = await apiRaw('/api/campaigns')
    expect(known.status).toBe(401)
  })
})
