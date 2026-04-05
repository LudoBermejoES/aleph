/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: { method?: string; headers?: Record<string, string>; body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    method: opts?.method,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  return match ? `better-auth.session_token=${match[1]}` : ''
}

async function createApiKey(cookie: string, name = 'test-key') {
  const res = await api('/api/apikeys', { method: 'POST', headers: { Cookie: cookie }, body: { name } })
  return res.json()
}

async function apiOk(path: string, opts?: { method?: string; headers?: Record<string, string>; body?: unknown }) {
  const res = await api(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

describe('Character Folder CRUD (integration)', () => {
  const ts = Date.now()
  const email = `char-folder-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''
  let folderId = ''
  let characterSlug = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'folder-key')
    apiKey = keyData.key

    const camp = await apiOk('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Folder CRUD Test ${ts}` },
    })
    campaignId = camp.id
  })

  it('POST character folder returns id and name', async () => {
    const res = await api(`/api/campaigns/${campaignId}/character-folders`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Villains' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data.name).toBe('Villains')
    folderId = data.id
  })

  it('GET character folders includes the created folder', async () => {
    const foldersBody = await apiOk(`/api/campaigns/${campaignId}/character-folders`, {
      headers: { 'X-API-Key': apiKey },
    })
    const folders = foldersBody.data ?? foldersBody
    expect(Array.isArray(folders)).toBe(true)
    const found = folders.find((f: any) => f.id === folderId)
    expect(found).toBeDefined()
    expect(found.name).toBe('Villains')
  })

  it('PUT character folder updates name and returns success', async () => {
    const res = await api(`/api/campaigns/${campaignId}/character-folders/${folderId}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Villains Updated' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify name updated
    const foldersBody = await apiOk(`/api/campaigns/${campaignId}/character-folders`, {
      headers: { 'X-API-Key': apiKey },
    })
    const folders = foldersBody.data ?? foldersBody
    const found = folders.find((f: any) => f.id === folderId)
    expect(found?.name).toBe('Villains Updated')
  })

  it('PUT character with folderId links the character to the folder', async () => {
    const character = await apiOk(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Villain1', characterType: 'npc' },
    })
    characterSlug = character.slug
    expect(character).toHaveProperty('slug')

    // Assign to folder via PUT
    await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { folderId },
    })

    // Verify folderId on the character list
    const charactersBody = await apiOk(`/api/campaigns/${campaignId}/characters`, {
      headers: { 'X-API-Key': apiKey },
    })
    const characters = charactersBody.data ?? charactersBody
    const found = characters.find((c: any) => c.slug === characterSlug)
    expect(found).toBeDefined()
    expect(found.folderId).toBe(folderId)
  })

  it('DELETE character folder returns 200 and nullifies character folderId', async () => {
    const res = await api(`/api/campaigns/${campaignId}/character-folders/${folderId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Folder should be gone
    const foldersBody = await apiOk(`/api/campaigns/${campaignId}/character-folders`, {
      headers: { 'X-API-Key': apiKey },
    })
    const folders = foldersBody.data ?? foldersBody
    const found = folders.find((f: any) => f.id === folderId)
    expect(found).toBeUndefined()

    // Character folderId should now be null
    const charactersBody = await apiOk(`/api/campaigns/${campaignId}/characters`, {
      headers: { 'X-API-Key': apiKey },
    })
    const characters = charactersBody.data ?? charactersBody
    const char = characters.find((c: any) => c.slug === characterSlug)
    expect(char).toBeDefined()
    expect(char.folderId).toBeNull()
  })

  it('PUT character folder by player returns 403', async () => {
    const playerEmail = `folder-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'folder-player-put-key')
    const playerApiKey = playerKeyData.key

    // Create a fresh folder for this test
    const folder = await apiOk(`/api/campaigns/${campaignId}/character-folders`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Protected Folder' },
    })

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

    const res = await api(`/api/campaigns/${campaignId}/character-folders/${folder.id}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { name: 'Should Fail' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE character folder by player returns 403', async () => {
    const playerEmail = `folder-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'folder-player-del-key')
    const playerApiKey = playerKeyData.key

    const folder = await apiOk(`/api/campaigns/${campaignId}/character-folders`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Delete Protected Folder' },
    })

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

    const res = await api(`/api/campaigns/${campaignId}/character-folders/${folder.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
