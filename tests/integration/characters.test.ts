import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Character CRUD (integration)', () => {
  const email = `char-test-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let characterSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Char Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
    const campList = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
    const setCookie = campList.headers.get('set-cookie') || ''
    const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
    csrfToken = csrfMatch?.[1] || ''
    cookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `Char Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id
  })

  it('POST creates character with entity + character row', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: {
        name: 'Gandalf the Grey',
        characterType: 'npc',
        content: '# Gandalf\n\nA wise wizard.',
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slug).toContain('gandalf')
    expect(data.characterType).toBe('npc')
    characterSlug = data.slug
  })

  it('GET returns character with stats and abilities', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Gandalf the Grey')
    // Content comes from the .md file
    expect(data.content).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.abilities).toBeDefined()
  })

  it('GET returns top-level fields object (empty when no template fields)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('fields')
    expect(typeof data.fields).toBe('object')
  })

  it('POST ability adds to character', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/abilities`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'Fireball', type: 'spell', description: 'Hurls a ball of fire' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Fireball')
  })

  it('GET abilities returns created ability', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/abilities`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(data.some((a: Record<string, unknown>) => a.name === 'Fireball')).toBe(true)
  })

  it('PUT updates character fields', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { status: 'missing' },
    })
    expect(res.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.status).toBe('missing')
  })

  it('GET character list filters by type', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?type=npc`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const body = await res.json()
    const data = body.data ?? body
    expect(data.every((c: Record<string, unknown>) => c.characterType === 'npc')).toBe(true)
  })

  it('POST duplicate creates copy', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/duplicate`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toContain('(Copy)')
    expect(data.slug).not.toBe(characterSlug)
  })

  it('POST with templateId and fields stores them on the character', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: {
        name: 'Gandalf With Template',
        characterType: 'npc',
        templateId: 'tmpl-test-123',
        fields: { background: 'Wizard', level: 20 },
      },
    })
    expect(res.status).toBe(200)
    const created = await res.json()
    expect(created.slug).toBeTruthy()

    const get = await api(`/api/campaigns/${campaignId}/characters/${created.slug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(get.status).toBe(200)
    const data = await get.json()
    expect(data.templateId).toBe('tmpl-test-123')
    expect(data.fields.background).toBe('Wizard')
    expect(data.fields.level).toBe(20)
  })

  it('PUT with fields updates stored field values', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'Fields Update Test', characterType: 'npc', fields: { background: 'Farmer' } },
    })
    const { slug: testSlug } = await createRes.json()

    const putRes = await api(`/api/campaigns/${campaignId}/characters/${testSlug}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { fields: { background: 'Merchant' } },
    })
    expect(putRes.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/characters/${testSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.fields.background).toBe('Merchant')
  })

  it('DELETE removes character', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'DELETE',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    })
    expect(res.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'GET',
      headers: { Cookie: cookie },
    })
    expect(get.status).toBe(404)
  })
})
