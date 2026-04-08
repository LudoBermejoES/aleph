import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE_URL,
      ...opts?.headers,
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function getCsrfToken(sessionCookie: string): Promise<string> {
  const res = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = res.headers.get('set-cookie') || ''
  const match = setCookie.match(/csrf_token=([^;]+)/)
  return match?.[1] || ''
}

function withCsrf(cookie: string, csrfToken: string) {
  return { Cookie: `${cookie}; csrf_token=${csrfToken}`, 'X-CSRF-Token': csrfToken }
}

describe('Entity CRUD (integration)', () => {
  const email = `entity-test-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let entitySlug = ''

  beforeAll(async () => {
    // Register + login
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Entity Tester', email, password: 'password123' },
    })
    const login = await apiRaw('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''
    csrfToken = await getCsrfToken(cookie)

    // Create campaign
    const campRes = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: { name: `Entity Test ${Date.now()}` },
    })
    const campData = await campRes.json()
    campaignId = campData.id
  })

  it('POST creates entity with .md file', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: withCsrf(cookie, csrfToken),
      body: {
        name: 'Strahd von Zarovich',
        type: 'character',
        content: '# Strahd\n\nA vampire lord.',
        aliases: ['Strahd', 'The Devil'],
        tags: ['vampire'],
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slug).toContain('strahd-von-zarovich')
    expect(data.id).toBeDefined()
    entitySlug = data.slug
  })

  it('GET returns entity with frontmatter and content', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Strahd von Zarovich')
    expect(data.type).toBe('character')
    expect(data.frontmatter.aliases).toContain('Strahd')
    expect(data.content).toContain('vampire lord')
  })

  it('PUT updates entity', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'PUT',
      headers: withCsrf(cookie, csrfToken),
      body: { name: 'Strahd von Zarovich (Updated)', content: '# Updated\n\nNew content.' },
    })
    expect(res.status).toBe(200)

    // Verify update
    const getRes = await apiRaw(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await getRes.json()
    expect(data.name).toBe('Strahd von Zarovich (Updated)')
    expect(data.content).toContain('New content')
  })

  it('GET list returns entities with pagination', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities?page=1&limit=10`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.entities.length).toBeGreaterThanOrEqual(1)
    expect(data.pagination.total).toBeGreaterThanOrEqual(1)
    expect(data.pagination.page).toBe(1)
  })

  it('GET list filters by type', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities?type=character`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.entities.every((e: Record<string, unknown>) => e.type === 'character')).toBe(true)
  })

  it('search finds entity by name', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/search?q=Strahd`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.results.length).toBeGreaterThanOrEqual(1)
  })

  it('DELETE removes entity', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'DELETE',
      headers: withCsrf(cookie, csrfToken),
    })
    expect(res.status).toBe(200)

    // Verify deleted
    const getRes = await apiRaw(`/api/campaigns/${campaignId}/entities/${entitySlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(getRes.status).toBe(404)
  })
})
