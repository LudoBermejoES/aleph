/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(path: string, opts?: any) {
  const res = await apiRaw(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
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

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await apiRaw('/api/apikeys', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: { name } })
  return res.json()
}

describe('Quest Delete (integration)', () => {
  const ts = Date.now()
  const email = `quest-del-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'quest-del-key')
    apiKey = keyData.key
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Quest Delete Test ${ts}` },
    })
    campaignId = camp.id
  })

  it('POST quest creates a quest with a slug', async () => {
    const created = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Smoke Test Quest', type: 'main' },
    })
    expect(created).toHaveProperty('id')
    expect(created).toHaveProperty('slug')
    expect(created.name).toBe('Smoke Test Quest')
  })

  it('DELETE quest returns 200 and removes the quest', async () => {
    const created = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Quest To Delete', type: 'main' },
    })
    const { slug } = created

    const res = await apiRaw(`/api/campaigns/${campaignId}/quests/${slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify it's gone from the list
    const quests = await api(`/api/campaigns/${campaignId}/quests`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(quests.find((q: any) => q.slug === slug)).toBeUndefined()
  })

  it('DELETE parent quest unlinks child quest (parentQuestId set to null)', async () => {
    const parent = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Parent Quest', type: 'main' },
    })

    const child = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Child Quest', type: 'side', parentQuestId: parent.id },
    })

    // Delete the parent
    const delRes = await apiRaw(`/api/campaigns/${campaignId}/quests/${parent.slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)

    // Child quest should still exist with parentQuestId = null
    const quests = await api(`/api/campaigns/${campaignId}/quests`, {
      headers: { 'X-API-Key': apiKey },
    })
    const childAfter = quests.find((q: any) => q.slug === child.slug)
    expect(childAfter).toBeDefined()
    expect(childAfter.parentQuestId).toBeNull()
  })

  it('DELETE non-existent quest slug returns 404', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/quests/no-such-quest-slug-xyz`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(404)
  })

  it('DELETE quest by player role returns 403', async () => {
    const playerEmail = `quest-del-player-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'quest-player-key')
    const playerApiKey = playerKeyData.key

    // Invite and join as player
    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const created = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Role Test Quest', type: 'main' },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/quests/${created.slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
