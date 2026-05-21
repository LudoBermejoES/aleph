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

describe('Organizations as entities (integration)', () => {
  const email = `org-entity-${Date.now()}@example.com`
  const password = 'password123'
  let apiKey = ''
  let campaignId = ''
  let orgSlug = ''
  let orgId = ''
  let charEntityId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie, 'org-entity-key')
    apiKey = keyData.key
    const campaign = await createCampaign(apiKey, `Org Entity Campaign ${Date.now()}`)
    campaignId = campaign.id

    // Create a character so we have a valid entity target for relations
    await apiRaw(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Aragorn', characterType: 'pc' },
    })
    // The character entity id is available from the entity endpoint
    const entityRes = await apiRaw(`/api/campaigns/${campaignId}/entities/aragorn`, {
      headers: { 'X-API-Key': apiKey },
    })
    const entityData = await entityRes.json()
    charEntityId = entityData.id
  })

  it('POST /organizations returns entityId in response', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'The Fellowship', type: 'faction' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.entityId).toBeTruthy()
    expect(data.entityId).toBe(data.id)
    orgSlug = data.slug
    orgId = data.id
  })

  it('GET /entities/:org-slug resolves organization entity row', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/entities/${orgSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.type).toBe('organization')
    expect(data.id).toBe(orgId)
  })

  it('GET /organizations list includes entityId', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const list = body.data ?? body
    const org = list.find((o: Record<string, unknown>) => o.slug === orgSlug)
    expect(org).toBeDefined()
    expect(org.entityId).toBeTruthy()
  })

  it('PUT /organizations/:slug renames org and entity row', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'The Fellowship of the Ring' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slug).toBe('the-fellowship-of-the-ring')

    // Entity should also be renamed
    const entityRes = await apiRaw(
      `/api/campaigns/${campaignId}/entities/the-fellowship-of-the-ring`,
      { headers: { 'X-API-Key': apiKey } },
    )
    expect(entityRes.status).toBe(200)
    const entityData = await entityRes.json()
    expect(entityData.name).toBe('The Fellowship of the Ring')
    expect(entityData.type).toBe('organization')

    orgSlug = data.slug
  })

  it('POST /relations with org entity id as source succeeds', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        sourceEntityId: orgId,
        targetEntityId: charEntityId,
        forwardLabel: 'member of',
        reverseLabel: 'includes',
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeTruthy()
  })

  it('DELETE /organizations/:slug removes both org and entity rows', async () => {
    // Create a throwaway org to delete
    const createRes = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Throwaway ${Date.now()}` },
    })
    const { id: throwawayId, slug: throwawaySlug } = await createRes.json()

    const delRes = await apiRaw(`/api/campaigns/${campaignId}/organizations/${throwawaySlug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)

    // Org gone
    const orgCheck = await apiRaw(`/api/campaigns/${campaignId}/organizations/${throwawaySlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(orgCheck.status).toBe(404)

    // Entity row also gone
    const entityCheck = await apiRaw(`/api/campaigns/${campaignId}/entities/${throwawaySlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    // Entity row used the same id as the org, so slug lookup should 404
    expect(entityCheck.status).toBe(404)
    void throwawayId
  })
})
