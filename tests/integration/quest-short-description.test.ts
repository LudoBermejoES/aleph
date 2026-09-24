/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'
import { QUEST_SHORT_DESCRIPTION_MAX_LENGTH } from '../../shared/utils/quest-short-description'

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
describe('Quest short description (integration)', () => {
  const ts = Date.now()
  const email = `quest-short-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'quest-short-key')
    apiKey = keyData.key
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Quest Short Desc ${ts}` },
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

  const update = (slug: string, body: Record<string, unknown>) =>
    apiRaw(`/api/campaigns/${campaignId}/quests/${slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body,
    })

  it('stores a short description and returns it unchanged', async () => {
    const text = 'Symcha Landau ha llegado a Berlin para juzgar el Avatar de Otto.'
    const created = await create({ name: `Juicio ${ts}`, shortDescription: text })
    const fetched = await read(created.slug)
    expect(fetched.shortDescription).toBe(text)
  })

  it('keeps the long description independent of the short one', async () => {
    const created = await create({
      name: `Independientes ${ts}`,
      shortDescription: 'La corta.',
      description: 'La larga, con **markdown** y varios parrafos.',
    })
    const fetched = await read(created.slug)
    expect(fetched.shortDescription).toBe('La corta.')
    expect(fetched.description).toBe('La larga, con **markdown** y varios parrafos.')
  })

  it('defaults to null when not supplied', async () => {
    const created = await create({ name: `Sin corta ${ts}` })
    const fetched = await read(created.slug)
    expect(fetched.shortDescription).toBeNull()
  })

  it('exposes the field on the LIST endpoint, not only on the detail', async () => {
    // The list projects columns explicitly, so it can return a plausible row with the field
    // missing while the detail endpoint looks perfectly healthy.
    const text = `Visible en el listado ${ts}`
    const created = await create({ name: `En listado ${ts}`, shortDescription: text })
    const rows = await api(`/api/campaigns/${campaignId}/quests`, {
      headers: { 'X-API-Key': apiKey },
    })
    const row = rows.find((q: { slug: string }) => q.slug === created.slug)
    expect(row).toBeDefined()
    expect(row.shortDescription).toBe(text)
  })

  it('accepts exactly the maximum length', async () => {
    const text = 'a'.repeat(QUEST_SHORT_DESCRIPTION_MAX_LENGTH)
    const created = await create({ name: `Al limite ${ts}`, shortDescription: text })
    const fetched = await read(created.slug)
    expect(fetched.shortDescription).toHaveLength(QUEST_SHORT_DESCRIPTION_MAX_LENGTH)
  })

  it('rejects one character over the limit and creates nothing', async () => {
    const before = await api(`/api/campaigns/${campaignId}/quests`, {
      headers: { 'X-API-Key': apiKey },
    })
    const res = await apiRaw(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        name: `Pasado ${ts}`,
        shortDescription: 'a'.repeat(QUEST_SHORT_DESCRIPTION_MAX_LENGTH + 1),
      },
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
    const after = await api(`/api/campaigns/${campaignId}/quests`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(after).toHaveLength(before.length)
  })

  it('rejects an over-long update and leaves the stored value intact', async () => {
    const created = await create({ name: `Intacta ${ts}`, shortDescription: 'Texto corto.' })
    const res = await update(created.slug, {
      shortDescription: 'a'.repeat(QUEST_SHORT_DESCRIPTION_MAX_LENGTH + 1),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    const fetched = await read(created.slug)
    expect(fetched.shortDescription).toBe('Texto corto.')
  })

  it('clears the field when sent null', async () => {
    const created = await create({ name: `A borrar ${ts}`, shortDescription: 'Se va a ir.' })
    const res = await update(created.slug, { shortDescription: null })
    expect(res.ok).toBe(true)
    const fetched = await read(created.slug)
    expect(fetched.shortDescription).toBeNull()
  })

  it('leaves the field untouched when the key is omitted', async () => {
    // The other half of the pair above, and the one that breaks silently: a handler written with
    // `if (body.shortDescription)` passes the clearing test and wipes the field on every unrelated
    // edit — a status change would quietly delete the summary.
    const created = await create({ name: `Sin tocar ${ts}`, shortDescription: 'Debe sobrevivir.' })
    const res = await update(created.slug, { status: 'completed' })
    expect(res.ok).toBe(true)
    const fetched = await read(created.slug)
    expect(fetched.shortDescription).toBe('Debe sobrevivir.')
    expect(fetched.status).toBe('completed')
  })
})
