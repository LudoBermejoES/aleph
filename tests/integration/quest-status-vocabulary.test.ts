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
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

/**
 * add-quest-short-description §3.4-3.6.
 *
 * Every assertion here READS THE FIELD BACK. A 2xx response proves nothing about persistence:
 * zod strips unknown keys silently, so a schema that forgot `shortDescription` would answer 200
 * to every one of these requests and store nothing — which is exactly the shape this repo has
 * been bitten by before.
 */

/**
 * fix-quest-status-vocabulary §2.4-2.6.
 *
 * Every case reads the status back. The two vocabularies disagreed for months while both halves
 * looked healthy in isolation, so an assertion that only checks the response code would have
 * passed throughout.
 */
describe('Quest status vocabulary (integration)', () => {
  const ts = Date.now()
  const email = `quest-status-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'quest-status-key')
    apiKey = keyData.key
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Quest Status ${ts}` },
    })
    campaignId = camp.id
  })

  const create = (body: Record<string, unknown>) =>
    api(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body,
    })

  const read = (slug: string) =>
    api(`/api/campaigns/${campaignId}/quests/${slug}`, { headers: { 'X-API-Key': apiKey } })

  const setStatus = (slug: string, status: string) =>
    apiRaw(`/api/campaigns/${campaignId}/quests/${slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { status },
    })

  it('accepts abandoned, the value the form offered and the server used to refuse', async () => {
    const q = await create({ name: `Abandonada ${ts}` })
    const res = await setStatus(q.slug, 'abandoned')
    expect(res.ok).toBe(true)
    expect((await read(q.slug)).status).toBe('abandoned')
  })

  it('reopens an abandoned quest', async () => {
    const q = await create({ name: `Reabierta ${ts}` })
    await setStatus(q.slug, 'abandoned')
    const res = await setStatus(q.slug, 'active')
    expect(res.ok).toBe(true)
    expect((await read(q.slug)).status).toBe('active')
  })

  it('reopens a completed quest', async () => {
    const q = await create({ name: `Recompletada ${ts}` })
    await setStatus(q.slug, 'completed')
    const res = await setStatus(q.slug, 'active')
    expect(res.ok).toBe(true)
    expect((await read(q.slug)).status).toBe('active')
  })

  it('refuses a completed quest jumping straight to failed, and stores nothing', async () => {
    const q = await create({ name: `Contradiccion ${ts}` })
    await setStatus(q.slug, 'completed')
    const res = await setStatus(q.slug, 'failed')
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect((await read(q.slug)).status).toBe('completed')
  })

  it('refuses on_hold on create, so no quest can be frozen the way one was in production', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Congelada ${ts}`, status: 'on_hold' },
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('refuses on_hold on update too', async () => {
    const q = await create({ name: `Ni de update ${ts}` })
    const res = await setStatus(q.slug, 'on_hold')
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect((await read(q.slug)).status).toBe('active')
  })
})
