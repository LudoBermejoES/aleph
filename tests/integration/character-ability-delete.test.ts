/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  // Trigger CSRF token generation
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

async function apiOk(path: string, opts?: RequestInit & { body?: unknown }) {
  const res = await api(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

describe('Character Ability Delete (integration)', () => {
  const ts = Date.now()
  const email = `char-ability-del-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let characterSlug = ''
  let abilityId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'char-ability-key')
    apiKey = keyData.key

    const camp = await apiOk('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Ability Delete Test ${ts}` },
    })
    campaignId = camp.id

    // Create character — uses `characterType`, not `type`
    const character = await apiOk(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Gandalf', characterType: 'npc' },
    })
    characterSlug = character.slug

    // Create ability
    const ability = await apiOk(
      `/api/campaigns/${campaignId}/characters/${characterSlug}/abilities`,
      {
        method: 'POST',
        headers: { 'X-API-Key': apiKey },
        body: { name: 'Fireball', type: 'spell' },
      },
    )
    abilityId = ability.id
  })

  it('POST ability returns id and name', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/abilities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Lightning Bolt', type: 'spell' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data.name).toBe('Lightning Bolt')
  })

  it('GET abilities returns the created ability', async () => {
    const abilities = await apiOk(
      `/api/campaigns/${campaignId}/characters/${characterSlug}/abilities`,
      {
        headers: { 'X-API-Key': apiKey },
      },
    )
    expect(Array.isArray(abilities)).toBe(true)
    const found = abilities.find((a: any) => a.id === abilityId)
    expect(found).toBeDefined()
    expect(found.name).toBe('Fireball')
    expect(found.type).toBe('spell')
  })

  it('DELETE ability returns 200', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/characters/${characterSlug}/abilities/${abilityId}`,
      {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      },
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('GET abilities after delete does not contain deleted ability', async () => {
    const abilities = await apiOk(
      `/api/campaigns/${campaignId}/characters/${characterSlug}/abilities`,
      {
        headers: { 'X-API-Key': apiKey },
      },
    )
    expect(Array.isArray(abilities)).toBe(true)
    const found = abilities.find((a: any) => a.id === abilityId)
    expect(found).toBeUndefined()
  })

  it('DELETE non-existent ability returns 404', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/characters/${characterSlug}/abilities/00000000-0000-0000-0000-000000000000`,
      { method: 'DELETE', headers: { 'X-API-Key': apiKey } },
    )
    expect(res.status).toBe(404)
  })

  it('POST ability by player returns 403', async () => {
    const playerEmail = `char-ability-player-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'ability-player-key')
    const playerApiKey = playerKeyData.key

    const invite = await apiOk(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    // Create another ability to attempt deletion
    const ability = await apiOk(
      `/api/campaigns/${campaignId}/characters/${characterSlug}/abilities`,
      {
        method: 'POST',
        headers: { 'X-API-Key': apiKey },
        body: { name: 'Protected Ability', type: 'custom' },
      },
    )

    const res = await api(
      `/api/campaigns/${campaignId}/characters/${characterSlug}/abilities/${ability.id}`,
      { method: 'DELETE', headers: { 'X-API-Key': playerApiKey } },
    )
    expect(res.status).toBe(403)
  })
})
