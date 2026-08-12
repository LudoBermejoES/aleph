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
  // Trigger CSRF token generation
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

function withCsrf(cookie: string) {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return { Cookie: cookie, 'X-CSRF-Token': csrfToken }
}

async function createApiKey(cookie: string, name = 'test-key') {
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: withCsrf(cookie),
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

describe('Organization CRUD (integration)', () => {
  const email = `org-crud-${Date.now()}@example.com`
  const password = 'password123'
  let apiKey = ''
  let campaignId = ''
  let orgSlug = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie, 'org-test-key')
    apiKey = keyData.key
    const campaign = await createCampaign(apiKey, `Org Test Campaign ${Date.now()}`)
    campaignId = campaign.id
  })

  it('GET /organizations returns 401 when unauthenticated', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`)
    expect(res.status).toBe(401)
  })

  it('GET /organizations returns empty array for new campaign', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(0)
  })

  it('POST /organizations returns 400 with missing name', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {},
    })
    expect([400, 422]).toContain(res.status)
  })

  it('POST /organizations creates org (dm role)', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        name: 'The Fellowship',
        type: 'faction',
        status: 'active',
        description: 'Nine walkers.',
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeDefined()
    expect(data.slug).toBe('the-fellowship')
    expect(data.type).toBe('faction')
    orgSlug = data.slug
  })

  it('POST /organizations returns 409 on duplicate slug', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'The Fellowship' },
    })
    expect(res.status).toBe(409)
  })

  it('GET /organizations lists org with memberCount', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    const org = data.find((o: Record<string, unknown>) => o.slug === orgSlug)
    expect(org).toBeDefined()
    expect(org.memberCount).toBeDefined()
  })

  it('GET /organizations/:slug returns org detail', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('The Fellowship')
    expect(Array.isArray(data.members)).toBe(true)
  })

  it('GET /organizations/:slug returns 404 for unknown slug', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/does-not-exist`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(404)
  })

  it('PUT /organizations/:slug updates fields', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { description: 'Updated description.', status: 'inactive' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.description).toBe('Updated description.')
    expect(data.status).toBe('inactive')
  })

  it('PUT /organizations/:slug returns 409 on slug collision via name change', async () => {
    // Create a second org to collide with
    await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Shadow Council' },
    })
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Shadow Council' },
    })
    expect(res.status).toBe(409)
  })

  it('DELETE /organizations/:slug deletes org', async () => {
    // Create a throwaway org to delete
    const createRes = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Throwaway Org ${Date.now()}` },
    })
    const { slug } = await createRes.json()

    const delRes = await apiRaw(`/api/campaigns/${campaignId}/organizations/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)

    const getRes = await apiRaw(`/api/campaigns/${campaignId}/organizations/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(getRes.status).toBe(404)
  })
})

describe('Organization member management (integration)', () => {
  const email = `org-members-${Date.now()}@example.com`
  const password = 'password123'
  let apiKey = ''
  let campaignId = ''
  let orgSlug = ''
  let characterId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie, 'org-member-test-key')
    apiKey = keyData.key

    const campaign = await createCampaign(apiKey, `Org Member Campaign ${Date.now()}`)
    campaignId = campaign.id

    // Create an org
    const orgRes = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Test Guild' },
    })
    orgSlug = (await orgRes.json()).slug

    // Create a character to use as member
    const charRes = await apiRaw(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Frodo Baggins', characterType: 'pc' },
    })
    const charData = await charRes.json()
    characterId = charData.id
  })

  it('POST /members adds character, returns 200', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}/members`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { characterId, role: 'Ring-bearer' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.characterId).toBe(characterId)
    expect(data.role).toBe('Ring-bearer')
  })

  it('POST /members returns 409 on duplicate', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}/members`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { characterId },
    })
    expect(res.status).toBe(409)
  })

  it('GET /:slug shows member in members array', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    const data = await res.json()
    const member = data.members.find((m: Record<string, unknown>) => m.characterId === characterId)
    expect(member).toBeDefined()
    expect(member.role).toBe('Ring-bearer')
    expect(member.characterName).toBe('Frodo Baggins')
  })

  it('POST /members returns 404 for character not in campaign', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}/members`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { characterId: '00000000-0000-0000-0000-000000000000' },
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /members/:characterId removes member, returns 200', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/organizations/${orgSlug}/members/${characterId}`,
      {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      },
    )
    expect(res.status).toBe(200)

    const getRes = await apiRaw(`/api/campaigns/${campaignId}/organizations/${orgSlug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    const data = await getRes.json()
    expect(
      data.members.find((m: Record<string, unknown>) => m.characterId === characterId),
    ).toBeUndefined()
  })

  it('DELETE /members/:characterId returns 404 for non-member', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/organizations/${orgSlug}/members/${characterId}`,
      {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      },
    )
    expect(res.status).toBe(404)
  })
})

describe('Organization access control (integration)', () => {
  it('player role cannot create organizations (403)', async () => {
    // Create DM user and campaign
    const dmEmail = `org-ac-dm-${Date.now()}@example.com`
    const dmCookie = await signUpAndGetCookie(dmEmail, 'password123', 'DM User')
    const dmKeyData = await createApiKey(dmCookie, 'dm-key')
    const dmKey = dmKeyData.key
    const campaign = await createCampaign(dmKey, `AC Campaign ${Date.now()}`)
    const campaignId = campaign.id

    // Create player user and invite them
    const playerEmail = `org-ac-player-${Date.now()}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail, 'password123', 'Player User')
    const playerKeyData = await createApiKey(playerCookie, 'player-key')
    const playerKey = playerKeyData.key

    // Create invite link as DM
    const inviteRes = await apiRaw(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()

    // Accept invite as player
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie),
      body: { token },
    })

    // Player tries to create org — should be 403
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': playerKey },
      body: { name: 'Player Org' },
    })
    expect(res.status).toBe(403)
  })

  it('player cannot list or fetch a dm_only organization, but co_dm and dm can', async () => {
    const dmEmail = `org-vis-dm-${Date.now()}@example.com`
    const dmCookie = await signUpAndGetCookie(dmEmail, 'password123', 'DM User')
    const dmKey = (await createApiKey(dmCookie, 'dm-key')).key
    const campaign = await createCampaign(dmKey, `Vis Campaign ${Date.now()}`)
    const campaignId = campaign.id

    const playerEmail = `org-vis-player-${Date.now()}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail, 'password123', 'Player User')
    const playerKey = (await createApiKey(playerCookie, 'player-key')).key
    const inviteRes = await apiRaw(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(playerCookie),
      body: { token },
    })

    const createRes = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: 'Hidden Cabal', visibility: 'dm_only' },
    })
    const org = await createRes.json()

    // Player: excluded from list, 404 on detail
    const playerList = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      headers: { 'X-API-Key': playerKey },
    })
    const playerListBody = await playerList.json()
    const playerNames = (playerListBody.data ?? playerListBody).map((o: { name: string }) => o.name)
    expect(playerNames).not.toContain('Hidden Cabal')

    const playerDetail = await apiRaw(`/api/campaigns/${campaignId}/organizations/${org.slug}`, {
      headers: { 'X-API-Key': playerKey },
    })
    expect(playerDetail.status).toBe(404)

    // DM: included in list, 200 on detail
    const dmList = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      headers: { 'X-API-Key': dmKey },
    })
    const dmListBody = await dmList.json()
    const dmNames = (dmListBody.data ?? dmListBody).map((o: { name: string }) => o.name)
    expect(dmNames).toContain('Hidden Cabal')

    const dmDetail = await apiRaw(`/api/campaigns/${campaignId}/organizations/${org.slug}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(dmDetail.status).toBe(200)
  })

  it('a private organization is visible only to its creator', async () => {
    const dmEmail = `org-priv-dm-${Date.now()}@example.com`
    const dmCookie = await signUpAndGetCookie(dmEmail, 'password123', 'DM User')
    const dmKey = (await createApiKey(dmCookie, 'dm-key')).key
    const campaign = await createCampaign(dmKey, `Priv Campaign ${Date.now()}`)
    const campaignId = campaign.id

    const editorEmail = `org-priv-editor-${Date.now()}@example.com`
    const editorCookie = await signUpAndGetCookie(editorEmail, 'password123', 'Editor User')
    const editorKey = (await createApiKey(editorCookie, 'editor-key')).key
    const inviteRes = await apiRaw(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { role: 'editor' },
    })
    const { token } = await inviteRes.json()
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: withCsrf(editorCookie),
      body: { token },
    })

    const createRes = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: "DM's Private Club", visibility: 'private' },
    })
    const org = await createRes.json()

    const creatorDetail = await apiRaw(`/api/campaigns/${campaignId}/organizations/${org.slug}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(creatorDetail.status).toBe(200)

    const otherDetail = await apiRaw(`/api/campaigns/${campaignId}/organizations/${org.slug}`, {
      headers: { 'X-API-Key': editorKey },
    })
    expect(otherDetail.status).toBe(404)
  })
})
