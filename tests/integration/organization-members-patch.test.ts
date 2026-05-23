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

describe('PATCH /organizations/:slug/members/:characterId (integration)', () => {
  const email = `member-patch-${Date.now()}@example.com`
  const password = 'password123'
  let dmApiKey = ''
  let campaignId = ''
  let orgSlug = ''
  let characterId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie, 'member-patch-key')
    dmApiKey = keyData.key
    const campaign = await createCampaign(dmApiKey, `MemberPatch ${Date.now()}`)
    campaignId = campaign.id

    // Create an org
    const orgRes = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'Test Faction', type: 'faction' },
    })
    const org = await orgRes.json()
    orgSlug = org.slug

    // Create a character
    const charRes = await apiRaw(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { name: 'Test Hero', characterType: 'pc' },
    })
    const char = await charRes.json()
    characterId = char.id

    // Add character as member with initial role
    await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}/members`, {
      method: 'POST',
      headers: { 'X-API-Key': dmApiKey },
      body: { characterId, role: 'Knight' },
    })
  })

  it('401 when unauthenticated', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/organizations/${orgSlug}/members/${characterId}`,
      { method: 'PATCH', body: { role: 'Commander' } },
    )
    expect(res.status).toBe(401)
  })

  it('updates member role and returns updated membership', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/organizations/${orgSlug}/members/${characterId}`,
      {
        method: 'PATCH',
        headers: { 'X-API-Key': dmApiKey },
        body: { role: 'Commander' },
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBe('Commander')
  })

  it('reflects updated role in subsequent GET', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}/members`, {
      headers: { 'X-API-Key': dmApiKey },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const member = (body.data ?? body).find(
      (m: { characterId: string }) => m.characterId === characterId,
    )
    expect(member).toBeDefined()
    expect(member.role).toBe('Commander')
  })

  it('can clear role by patching with empty string', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/organizations/${orgSlug}/members/${characterId}`,
      {
        method: 'PATCH',
        headers: { 'X-API-Key': dmApiKey },
        body: { role: '' },
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBeNull()
  })

  it('404 when member does not exist', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/organizations/${orgSlug}/members/nonexistent-id`,
      {
        method: 'PATCH',
        headers: { 'X-API-Key': dmApiKey },
        body: { role: 'Squire' },
      },
    )
    expect(res.status).toBe(404)
  })
})
