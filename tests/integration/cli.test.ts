import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Origin': BASE_URL,
      ...opts?.headers,
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
  return res
}

describe('CLI token endpoint (integration)', () => {
  const email = `cli-test-${Date.now()}@example.com`
  const password = 'clipassword123'
  let token = ''

  beforeAll(async () => {
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'CLI Test User', email, password },
    })
  })

  it('POST /api/cli/token returns a token for valid credentials', async () => {
    const res = await apiRaw('/api/cli/token', {
      method: 'POST',
      body: { email, password },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data.token).toBe('string')
    expect(data.token.length).toBeGreaterThan(10)
    token = data.token
  })

  it('rejects invalid credentials with 401', async () => {
    const res = await apiRaw('/api/cli/token', {
      method: 'POST',
      body: { email, password: 'wrongpassword' },
    })
    expect(res.status).toBe(401)
  })

  it('rejects request with missing fields with 400', async () => {
    const res = await apiRaw('/api/cli/token', {
      method: 'POST',
      body: { email },
    })
    expect(res.status).toBe(400)
  })

  describe('Bearer token auth', () => {
    it('bearer token authenticates against /api/campaigns', async () => {
      // token is set in outer scope after the login test runs
      const res = await apiRaw('/api/campaigns', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('invalid bearer token returns 401', async () => {
      const res = await apiRaw('/api/campaigns', {
        method: 'GET',
        headers: { Authorization: 'Bearer invalidtoken00000000' },
      })
      expect(res.status).toBe(401)
    })
  })
})

describe('CLI campaign workflow (integration)', () => {
  const email = `cli-camp-${Date.now()}@example.com`
  const password = 'clipassword123'
  let token = ''
  let campaignId = ''
  let campaignSlug = ''

  beforeAll(async () => {
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'CLI Campaign User', email, password },
    })
    const res = await apiRaw('/api/cli/token', {
      method: 'POST',
      body: { email, password },
    })
    const data = await res.json()
    token = data.token
  })

  it('campaign list returns array', async () => {
    const res = await apiRaw('/api/campaigns', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('campaign create returns new campaign', async () => {
    const res = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { name: `CLI Test Campaign ${Date.now()}`, theme: 'cyberpunk' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeDefined()
    expect(data.slug).toBeDefined()
    campaignId = data.id
    campaignSlug = data.slug
  })

  it('campaign show returns campaign by id', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(campaignId)
    expect(data.theme).toBe('cyberpunk')
  })

  describe('entity CRUD', () => {
    let entitySlug = ''

    it('entity create', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/entities`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Test NPC', type: 'npc', content: 'A mysterious figure.' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.slug).toBeDefined()
      entitySlug = data.slug
    })

    it('entity list returns the created entity', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/entities`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      const found = data.find((e: any) => e.slug === entitySlug)
      expect(found).toBeDefined()
    })

    it('entity show returns entity by slug', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.name).toBe('Test NPC')
    })

    it('entity edit updates content', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: { content: 'Updated description.' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.content).toBe('Updated description.')
    })

    it('entity delete removes entity', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)

      const check = await apiRaw(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(check.status).toBe(404)
    })
  })

  describe('search', () => {
    beforeAll(async () => {
      await apiRaw(`/api/campaigns/${campaignId}/entities`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Searchable Dragon', type: 'creature', content: 'A big red dragon.' },
      })
    })

    it('search returns matching results', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/search?q=Dragon`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      const results = data.results || data
      expect(Array.isArray(results)).toBe(true)
      const found = results.find((r: any) => r.name?.includes('Dragon'))
      expect(found).toBeDefined()
    })
  })

  describe('roll endpoint', () => {
    it('POST /api/campaigns/:id/roll returns roll result', async () => {
      const res = await apiRaw(`/api/campaigns/${campaignId}/roll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { formula: '2d6+3' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.formula).toBe('2d6+3')
      expect(Array.isArray(data.rolls)).toBe(true)
      expect(data.rolls.length).toBe(2)
      expect(data.total).toBeGreaterThanOrEqual(5)  // min: 1+1+3
      expect(data.total).toBeLessThanOrEqual(15)    // max: 6+6+3
    })
  })

  it('campaign delete removes the campaign', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)

    const check = await apiRaw(`/api/campaigns/${campaignId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(check.status).toBe(404)
  })
})

describe('CLI logout (integration)', () => {
  const email = `cli-logout-${Date.now()}@example.com`
  const password = 'clipassword123'

  it('DELETE /api/cli/token invalidates the token', async () => {
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'CLI Logout User', email, password },
    })
    const loginRes = await apiRaw('/api/cli/token', {
      method: 'POST',
      body: { email, password },
    })
    const { token } = await loginRes.json()

    // Token works before logout
    const before = await apiRaw('/api/campaigns', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(before.status).toBe(200)

    // Logout
    const logoutRes = await apiRaw('/api/cli/token', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(logoutRes.status).toBe(200)

    // Token no longer works
    const after = await apiRaw('/api/campaigns', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(after.status).toBe(401)
  })
})
