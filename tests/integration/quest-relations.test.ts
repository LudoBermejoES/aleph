/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
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

describe('Quests are relatable entities (integration)', () => {
  const ts = Date.now()
  const email = `quest-rel-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'quest-rel-key')
    apiKey = keyData.key
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Quest Relations Test ${ts}` },
    })
    campaignId = camp.id
  })

  it('quest creation registers a mirror entity with type "quest"', async () => {
    const quest = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Encontrar al herrero ${ts}` },
    })

    const entity = await api(`/api/campaigns/${campaignId}/entities/${quest.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entity.type).toBe('quest')
    expect(entity.name).toBe(`Encontrar al herrero ${ts}`)
    expect(entity.id).toBe(quest.id)
  })

  it('a quest name colliding with an existing entity gets a de-duplicated slug', async () => {
    const name = `Colliding Name ${ts}`
    const location = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name, subtype: 'town' },
    })

    const quest = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name },
    })

    expect(quest.slug).not.toBe(location.slug)

    const entity = await api(`/api/campaigns/${campaignId}/entities/${quest.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entity.type).toBe('quest')
  })

  it('a relation can be created between two quests', async () => {
    const main = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Main Quest ${ts}` },
    })
    const sub = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Sub Quest ${ts}` },
    })

    const relation = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        sourceEntityId: sub.id,
        targetEntityId: main.id,
        forwardLabel: 'es parte de',
        reverseLabel: 'incluye la sub-misión',
      },
    })
    expect(relation).toHaveProperty('id')

    const list = await api(
      `/api/campaigns/${campaignId}/relations?entity_id=${encodeURIComponent(main.id)}`,
      { headers: { 'X-API-Key': apiKey } },
    )
    expect(list.some((r: Record<string, unknown>) => r.sourceEntityId === sub.id)).toBe(true)
  })

  it('a relation can be created between a quest and a character', async () => {
    const quest = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Quest With Giver ${ts}` },
    })
    const character = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Quest Giver ${ts}` },
    })

    const relation = await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        sourceEntityId: quest.id,
        targetEntityId: character.entityId,
        forwardLabel: 'dado por',
        reverseLabel: 'encargó',
      },
    })
    expect(relation).toHaveProperty('id')
  })

  it('a player cannot create a relation involving a quest', async () => {
    const quest = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Restricted Quest ${ts}` },
    })
    const other = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Other Quest ${ts}` },
    })

    const playerEmail = `quest-rel-player-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'quest-rel-player-key')
    const playerApiKey = playerKeyData.key

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

    const res = await apiRaw(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': playerApiKey },
      body: { sourceEntityId: quest.id, targetEntityId: other.id },
    })
    expect(res.status).toBe(403)
  })

  it('a relation between quests in different campaigns is rejected', async () => {
    const quest = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Local Quest ${ts}` },
    })
    const otherCampaign = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Other Campaign ${ts}` },
    })
    const foreignQuest = await api(`/api/campaigns/${otherCampaign.id}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Foreign Quest ${ts}` },
    })

    const res = await apiRaw(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { sourceEntityId: quest.id, targetEntityId: foreignQuest.id },
    })
    expect(res.status).toBe(400)
  })

  it('renaming a quest updates its mirror entity name', async () => {
    const quest = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Original Name ${ts}` },
    })

    await api(`/api/campaigns/${campaignId}/quests/${quest.slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Renamed ${ts}` },
    })

    const entity = await api(`/api/campaigns/${campaignId}/entities/${quest.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entity.name).toBe(`Renamed ${ts}`)
  })

  it('deleting a quest also removes its mirror entity and any relations referencing it', async () => {
    const main = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Survivor Quest ${ts}` },
    })
    const toDelete = await api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Doomed Quest ${ts}` },
    })
    await api(`/api/campaigns/${campaignId}/relations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        sourceEntityId: toDelete.id,
        targetEntityId: main.id,
        forwardLabel: 'es parte de',
        reverseLabel: 'incluye la sub-misión',
      },
    })

    const delRes = await apiRaw(`/api/campaigns/${campaignId}/quests/${toDelete.slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)

    const entityRes = await apiRaw(`/api/campaigns/${campaignId}/entities/${toDelete.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(entityRes.status).toBe(404)

    const list = await api(
      `/api/campaigns/${campaignId}/relations?entity_id=${encodeURIComponent(main.id)}`,
      { headers: { 'X-API-Key': apiKey } },
    )
    expect(list).toEqual([])
  })
})
