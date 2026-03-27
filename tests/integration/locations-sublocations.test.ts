/// <reference types="node" />
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

async function api(path: string, opts?: any) {
  const res = await apiRaw(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function signUpAndGetCookie(email: string, password: string) {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Test User', email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  return match ? `better-auth.session_token=${match[1]}` : ''
}

async function createApiKey(cookie: string) {
  const res = await apiRaw('/api/apikeys', { method: 'POST', headers: { Cookie: cookie }, body: { name: 'test-key' } })
  return res.json()
}

async function createCampaign(apiKey: string, name: string) {
  return api('/api/campaigns', { method: 'POST', headers: { 'X-API-Key': apiKey }, body: { name, theme: 'default' } })
}

function auth(apiKey: string) {
  return { 'X-API-Key': apiKey }
}

describe('Sub-location creation (integration)', () => {
  const email = `subloc-${Date.now()}@example.com`
  const password = 'password123'
  let apiKey = ''
  let campaignId = ''
  let parentId = ''
  let parentSlug = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie)
    apiKey = keyData.key
    const campaign = await createCampaign(apiKey, `SubLoc Test ${Date.now()}`)
    campaignId = campaign.id

    const parent = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'Barovia', subtype: 'region', visibility: 'members' },
    })
    parentId = parent.id
    parentSlug = parent.slug
  })

  it('creates a child location with valid parentId', async () => {
    const child = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'Village of Barovia', subtype: 'village', parentId, visibility: 'members' },
    })
    expect(child.name).toBe('Village of Barovia')
    expect(child.parentId).toBe(parentId)
    expect(child.slug).toBeTruthy()
  })

  it('child appears in parent sub-locations list', async () => {
    // Create a second child to confirm list
    await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'Castle Ravenloft', subtype: 'dungeon', parentId, visibility: 'members' },
    })

    const subs = await api(`/api/campaigns/${campaignId}/locations/${parentSlug}/sub-locations`, {
      headers: auth(apiKey),
    })
    expect(subs.length).toBeGreaterThanOrEqual(2)
    const names = subs.map((s: any) => s.name)
    expect(names).toContain('Village of Barovia')
    expect(names).toContain('Castle Ravenloft')
  })

  it('child detail shows correct ancestor chain', async () => {
    const child = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'Great Hall', subtype: 'room', parentId, visibility: 'members' },
    })

    const detail = await api(`/api/campaigns/${campaignId}/locations/${child.slug}`, {
      headers: auth(apiKey),
    })
    expect(detail.ancestors).toHaveLength(1)
    expect(detail.ancestors[0].name).toBe('Barovia')
    expect(detail.ancestors[0].slug).toBe(parentSlug)
  })

  it('rejects parentId from a different campaign', async () => {
    const other = await createCampaign(apiKey, `Other Campaign ${Date.now()}`)
    const otherLoc = await api(`/api/campaigns/${other.id}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'Foreign Location', subtype: 'city', visibility: 'members' },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { ...auth(apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Child', subtype: 'room', parentId: otherLoc.id, visibility: 'members' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a non-location entity as parentId', async () => {
    // Use a random UUID that doesn't exist
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const res = await apiRaw(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { ...auth(apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Child', subtype: 'room', parentId: fakeId, visibility: 'members' }),
    })
    expect(res.status).toBe(400)
  })

  it('parent childCount reflects number of children', async () => {
    // Fresh parent to count precisely
    const freshParent = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'Fresh Region', subtype: 'region', visibility: 'members' },
    })

    await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'Child A', subtype: 'city', parentId: freshParent.id, visibility: 'members' },
    })
    await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'Child B', subtype: 'town', parentId: freshParent.id, visibility: 'members' },
    })

    const list = await api(`/api/campaigns/${campaignId}/locations`, { headers: auth(apiKey) })
    const parent = list.find((l: any) => l.id === freshParent.id)
    expect(parent?.childCount).toBe(2)
  })

  it('3-level nesting: grandchild ancestors include both parent and grandparent', async () => {
    const grandparent = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'The Realm', subtype: 'country', visibility: 'members' },
    })
    const parent2 = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'The Province', subtype: 'region', parentId: grandparent.id, visibility: 'members' },
    })
    const grandchild = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: auth(apiKey),
      body: { name: 'The Village', subtype: 'village', parentId: parent2.id, visibility: 'members' },
    })

    const detail = await api(`/api/campaigns/${campaignId}/locations/${grandchild.slug}`, {
      headers: auth(apiKey),
    })
    expect(detail.ancestors).toHaveLength(2)
    expect(detail.ancestors[0].name).toBe('The Realm')
    expect(detail.ancestors[1].name).toBe('The Province')
  })
})
