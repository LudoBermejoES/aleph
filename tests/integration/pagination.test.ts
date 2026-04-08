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
  const match = setCookie.match(/csrf_token=([^;]+)/)
  return match?.[1] || ''
}

function withCsrf(cookie: string, csrfToken: string) {
  return { Cookie: `${cookie}; csrf_token=${csrfToken}`, 'X-CSRF-Token': csrfToken }
}

describe('Pagination integration tests', () => {
  const email = `pagination-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Pagination Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''
    csrfToken = await getCsrfToken(cookie)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: `Pagination Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    // Create 5 characters for pagination tests
    for (let i = 1; i <= 5; i++) {
      await api(`/api/campaigns/${campaignId}/characters`, {
        method: 'POST',
        headers: withCsrf(cookie, csrfToken),
        body: { name: `Character ${i}`, characterType: 'npc' },
      })
    }
  })

  describe('characters endpoint', () => {
    it('returns paginated response with meta when pageSize > 0', async () => {
      const res = await api(`/api/campaigns/${campaignId}/characters?pageSize=2`, {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toBeDefined()
      expect(body.meta.page).toBe(1)
      expect(body.meta.pageSize).toBe(2)
      expect(body.meta.total).toBeGreaterThanOrEqual(5)
      expect(body.meta.totalPages).toBeGreaterThanOrEqual(3)
      expect(body.data.length).toBe(2)
    })

    it('returns page 2 correctly', async () => {
      const res = await api(`/api/campaigns/${campaignId}/characters?pageSize=2&page=2`, {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.meta.page).toBe(2)
      expect(body.data.length).toBe(2)
    })

    it('pageSize=0 returns flat array (backward compat)', async () => {
      const res = await api(`/api/campaigns/${campaignId}/characters?pageSize=0`, {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThanOrEqual(5)
    })

    it('page beyond total returns empty data with correct meta', async () => {
      const res = await api(`/api/campaigns/${campaignId}/characters?pageSize=50&page=999`, {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.length).toBe(0)
      expect(body.meta.page).toBe(999)
      expect(body.meta.total).toBeGreaterThanOrEqual(5)
    })

    it('default pageSize is 50', async () => {
      const res = await api(`/api/campaigns/${campaignId}/characters`, {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.meta.pageSize).toBe(50)
    })
  })

  describe('organizations endpoint', () => {
    beforeAll(async () => {
      await api(`/api/campaigns/${campaignId}/organizations`, {
        method: 'POST',
        headers: withCsrf(cookie, csrfToken),
        body: { name: 'Test Guild', type: 'guild', status: 'active' },
      })
    })

    it('returns paginated response with meta', async () => {
      const res = await api(`/api/campaigns/${campaignId}/organizations?pageSize=10`, {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toBeDefined()
      expect(body.meta.pageSize).toBe(10)
      expect(body.meta.total).toBeGreaterThanOrEqual(1)
    })

    it('pageSize=0 returns flat array (backward compat)', async () => {
      const res = await api(`/api/campaigns/${campaignId}/organizations?pageSize=0`, {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    })
  })

  describe('maps endpoint', () => {
    it('returns paginated response with meta', async () => {
      const res = await api(`/api/campaigns/${campaignId}/maps?pageSize=10`, {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toBeDefined()
      expect(body.meta.pageSize).toBe(10)
    })
  })
})
