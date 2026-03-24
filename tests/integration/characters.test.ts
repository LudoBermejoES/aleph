import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Character CRUD (integration)', () => {
  const email = `char-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let characterSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Char Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Char Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('POST creates character with entity + character row', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { name: 'Gandalf the Grey', characterType: 'npc', race: 'Maiar', class: 'Wizard', content: '# Gandalf\n\nA wise wizard.' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slug).toContain('gandalf')
    expect(data.characterType).toBe('npc')
    characterSlug = data.slug
  })

  it('GET returns character with stats and abilities', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Gandalf the Grey')
    expect(data.race).toBe('Maiar')
    // Content comes from the .md file
    expect(data.content).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.abilities).toBeDefined()
  })

  it('POST ability adds to character', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/abilities`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Fireball', type: 'spell', description: 'Hurls a ball of fire' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Fireball')
  })

  it('GET abilities returns created ability', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/abilities`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(data.some((a: any) => a.name === 'Fireball')).toBe(true)
  })

  it('PUT updates character fields', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'PUT', headers: { Cookie: cookie },
      body: { race: 'Istari', status: 'alive' },
    })
    expect(res.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await get.json()
    expect(data.race).toBe('Istari')
  })

  it('GET character list filters by type', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters?type=npc`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.every((c: any) => c.characterType === 'npc')).toBe(true)
  })

  it('POST duplicate creates copy', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/duplicate`, {
      method: 'POST', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toContain('(Copy)')
    expect(data.slug).not.toBe(characterSlug)
  })

  it('DELETE removes character', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'DELETE', headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)

    const get = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'GET', headers: { Cookie: cookie },
    })
    expect(get.status).toBe(404)
  })
})
