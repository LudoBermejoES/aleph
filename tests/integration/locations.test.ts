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

async function signUpAndGetCookie(email: string, password: string, name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  return match ? `better-auth.session_token=${match[1]}` : ''
}

async function createApiKey(cookie: string, name = 'test-key') {
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: { name },
  })
  return res.json()
}

async function createCampaign(apiKey: string, name: string) {
  return api('/api/campaigns', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: { name, theme: 'default' },
  })
}

describe('Location CRUD (integration)', () => {
  const email = `loc-crud-${Date.now()}@example.com`
  const password = 'password123'
  let apiKey = ''
  let campaignId = ''
  let locationSlug = ''
  let childSlug = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie, 'loc-test-key')
    apiKey = keyData.key
    const campaign = await createCampaign(apiKey, `Location Test ${Date.now()}`)
    campaignId = campaign.id
  })

  it('GET /locations returns 401 when unauthenticated', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/locations`)
    expect(res.status).toBe(401)
  })

  it('GET /locations returns empty array initially', async () => {
    const data = await api(`/api/campaigns/${campaignId}/locations`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(0)
  })

  it('POST /locations creates a location', async () => {
    const data = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Barovia', subtype: 'region', visibility: 'members', content: 'A dark land.' },
    })
    expect(data.name).toBe('Barovia')
    expect(data.slug).toBeTruthy()
    expect(data.subtype).toBe('region')
    locationSlug = data.slug
  })

  it('GET /locations returns the created location', async () => {
    const data = await api(`/api/campaigns/${campaignId}/locations`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.length).toBe(1)
    expect(data[0].name).toBe('Barovia')
  })

  it('GET /locations/:slug returns location details', async () => {
    const data = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.name).toBe('Barovia')
    expect(data.content).toContain('dark land')
    expect(Array.isArray(data.ancestors)).toBe(true)
    expect(data.ancestors.length).toBe(0)
  })

  it('POST /locations creates a child location', async () => {
    const parent = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    const data = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Castle Ravenloft', subtype: 'dungeon', parentId: parent.id, visibility: 'members' },
    })
    expect(data.name).toBe('Castle Ravenloft')
    childSlug = data.slug
  })

  it('GET /locations/:slug/sub-locations returns child', async () => {
    const data = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}/sub-locations`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.length).toBe(1)
    expect(data[0].name).toBe('Castle Ravenloft')
  })

  it('child location has ancestors', async () => {
    const data = await api(`/api/campaigns/${campaignId}/locations/${childSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.ancestors.length).toBe(1)
    expect(data.ancestors[0].name).toBe('Barovia')
  })

  it('PUT /locations/:slug updates location', async () => {
    const data = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Barovia Region', subtype: 'region', visibility: 'members', content: 'Updated.' },
    })
    expect(data.name).toBe('Barovia Region')
    locationSlug = data.slug
  })

  it('DELETE /locations/:slug deletes location', async () => {
    // Create a throwaway location to delete
    const loc = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Throwaway', subtype: 'other', visibility: 'members' },
    })
    const res = await apiRaw(`/api/campaigns/${campaignId}/locations/${loc.slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.ok).toBe(true)
    const getRes = await apiRaw(`/api/campaigns/${campaignId}/locations/${loc.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(getRes.status).toBe(404)
  })
})

describe('Location inhabitants (integration)', () => {
  const email = `loc-inh-${Date.now()}@example.com`
  const password = 'password123'
  let apiKey = ''
  let campaignId = ''
  let locationSlug = ''
  let characterId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie, 'loc-inh-key')
    apiKey = keyData.key
    const campaign = await createCampaign(apiKey, `Loc Inh Test ${Date.now()}`)
    campaignId = campaign.id

    const loc = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Village', subtype: 'village', visibility: 'members' },
    })
    locationSlug = loc.slug

    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Strahd', characterType: 'npc', status: 'alive', visibility: 'members' },
    })
    characterId = char.id
  })

  it('GET /inhabitants returns empty initially', async () => {
    const data = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}/inhabitants`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.length).toBe(0)
  })

  it('POST /inhabitants adds a character', async () => {
    await api(`/api/campaigns/${campaignId}/locations/${locationSlug}/inhabitants`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { characterId },
    })
    const data = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}/inhabitants`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.length).toBe(1)
    expect(data[0].name).toBe('Strahd')
  })

  it('DELETE /inhabitants/:characterId removes the character', async () => {
    const delRes = await apiRaw(`/api/campaigns/${campaignId}/locations/${locationSlug}/inhabitants/${characterId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.ok).toBe(true)
    const data = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}/inhabitants`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.length).toBe(0)
  })
})

describe('Location organizations (integration)', () => {
  const email = `loc-org-${Date.now()}@example.com`
  const password = 'password123'
  let apiKey = ''
  let campaignId = ''
  let locationSlug = ''
  let orgId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie, 'loc-org-key')
    apiKey = keyData.key
    const campaign = await createCampaign(apiKey, `Loc Org Test ${Date.now()}`)
    campaignId = campaign.id

    const loc = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'City', subtype: 'city', visibility: 'members' },
    })
    locationSlug = loc.slug

    const org = await api(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'City Guard', type: 'faction', status: 'active' },
    })
    orgId = org.id
  })

  it('GET /organizations returns empty initially', async () => {
    const data = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}/organizations`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.length).toBe(0)
  })

  it('POST /organizations links an organization', async () => {
    await api(`/api/campaigns/${campaignId}/locations/${locationSlug}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { organizationId: orgId },
    })
    const data = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}/organizations`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.length).toBe(1)
    expect(data[0].name).toBe('City Guard')
  })

  it('DELETE /organizations/:orgId unlinks the organization', async () => {
    const delRes = await apiRaw(`/api/campaigns/${campaignId}/locations/${locationSlug}/organizations/${orgId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.ok).toBe(true)
    const data = await api(`/api/campaigns/${campaignId}/locations/${locationSlug}/organizations`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(data.length).toBe(0)
  })
})
