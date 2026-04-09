import { describe, it, expect, beforeAll } from 'vitest'
import { signUpAndLogin, apiRaw } from './helpers'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

describe('Diagram Multiplayer Sync (integration)', () => {
  const ts = Date.now()
  let dmCookie = ''
  let dmCsrfToken = ''
  let outsiderCookie = ''
  let campaignId = ''
  let diagramId = ''

  beforeAll(async () => {
    ;({ cookie: dmCookie, csrfToken: dmCsrfToken } = await signUpAndLogin(
      `sync-dm-${ts}@example.com`,
      'password123',
      'Sync DM',
    ))
    ;({ cookie: outsiderCookie } = await signUpAndLogin(
      `sync-outsider-${ts}@example.com`,
      'password123',
      'Sync Outsider',
    ))

    // Create campaign
    const campRes = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
      body: { name: `Sync Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id

    // Create diagram
    const diagRes = await apiRaw(`/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
      body: { title: `Test Diagram ${ts}` },
    })
    const diag = await diagRes.json()
    diagramId = diag.id
  })

  describe('Presence endpoint', () => {
    it('GET /presence returns 200 with user count for DM', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}/presence`, {
        headers: { Cookie: dmCookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('count')
      expect(data).toHaveProperty('users')
      expect(typeof data.count).toBe('number')
      expect(Array.isArray(data.users)).toBe(true)
    })

    it('GET /presence returns 0 count when no sync connections', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}/presence`, {
        headers: { Cookie: dmCookie },
      })
      const data = await res.json()
      expect(data.count).toBe(0)
      expect(data.users).toHaveLength(0)
    })

    it('GET /presence returns 401 for unauthenticated request', async () => {
      const res = await fetch(
        `${BASE_URL}/api/campaigns/${campaignId}/diagrams/${diagramId}/presence`,
      )
      expect(res.status).toBe(401)
    })

    it('GET /presence returns 403 for non-member', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}/presence`, {
        headers: { Cookie: outsiderCookie },
      })
      expect(res.status).toBe(403)
    })

    it('GET /presence returns 404 for non-existent diagram', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/non-existent/presence`, {
        headers: { Cookie: dmCookie },
      })
      expect(res.status).toBe(404)
    })
  })

  describe('Snapshot endpoint still works (backward compatibility)', () => {
    it('PUT then GET snapshot roundtrip succeeds', async () => {
      const snapshot = {
        store: { 'page:page': { id: 'page:page', typeName: 'page', name: 'Page 1' } },
        schema: { schemaVersion: 2, sequences: {} },
      }

      const putRes = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
        method: 'PUT',
        headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
        body: snapshot,
      })
      expect(putRes.status).toBe(200)

      const getRes = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
        headers: { Cookie: dmCookie },
      })
      expect(getRes.status).toBe(200)
      const data = await getRes.json()
      expect(data.snapshot).toBeDefined()
      expect(data.version).toBeGreaterThanOrEqual(1)
    })
  })
})
