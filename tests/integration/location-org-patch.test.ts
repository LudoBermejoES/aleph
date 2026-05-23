/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE_URL,
      ...opts?.headers,
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
  return res
}

async function signUpAndGetCookie(email: string, password: string, name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

async function createCampaign(apiKey: string, name: string) {
  const res = await apiRaw('/api/campaigns', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: { name, theme: 'default' },
  })
  return res.json()
}

describe('PATCH /locations/:slug/organizations/:organizationId (integration)', () => {
  const email = `loc-org-patch-${Date.now()}@example.com`
  const password = 'password123'
  let dmApiKey = ''
  let campaignId = ''
  let locationSlug = ''
  let organizationId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie, 'loc-org-patch-key')
    dmApiKey = keyData.key
    const campaign = await createCampaign(dmApiKey, `LocOrgPatch ${Date.now()}`)
    campaignId = campaign.id

    // Create a location
    const locRes = await apiRaw(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'The Shire', slug: `the-shire-${Date.now()}` },
    })
    const loc = await locRes.json()
    locationSlug = loc.slug

    // Create an org
    const orgRes = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'Grey Traders', type: 'faction' },
    })
    const org = await orgRes.json()
    organizationId = org.id

    // Link org to location
    await apiRaw(`/api/campaigns/${campaignId}/locations/${locationSlug}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { organizationId },
    })
  })

  it('401 when unauthenticated', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/locations/${locationSlug}/organizations/${organizationId}`,
      { method: 'PATCH', body: { description: 'Seasonal traders' } },
    )
    expect(res.status).toBe(401)
  })

  it('updates org-location description and returns updated link', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/locations/${locationSlug}/organizations/${organizationId}`,
      {
        method: 'PATCH',
        headers: { 'X-API-Key': dmApiKey },
        body: { description: 'Seasonal trading post' },
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.description).toBe('Seasonal trading post')
  })

  it('reflects updated description in subsequent GET', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/locations/${locationSlug}/organizations`,
      { headers: { 'X-API-Key': dmApiKey } },
    )
    expect(res.status).toBe(200)
    const orgs = await res.json()
    const linked = orgs.find((o: { id: string }) => o.id === organizationId)
    expect(linked).toBeDefined()
    expect(linked.description).toBe('Seasonal trading post')
  })

  it('can clear description by patching with empty string', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/locations/${locationSlug}/organizations/${organizationId}`,
      {
        method: 'PATCH',
        headers: { 'X-API-Key': dmApiKey },
        body: { description: '' },
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.description).toBeNull()
  })

  it('404 when link does not exist', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/locations/${locationSlug}/organizations/nonexistent-org-id`,
      {
        method: 'PATCH',
        headers: { 'X-API-Key': dmApiKey },
        body: { description: 'Ghost link' },
      },
    )
    expect(res.status).toBe(404)
  })
})
