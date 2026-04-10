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
  if (!res.ok)
    throw new Error(`${opts?.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

describe('Location templateId and fields (integration)', () => {
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const email = `loc-tmpl-${Date.now()}@example.com`
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Loc Tmpl Tester', email, password: 'password123' },
    })
    const loginRes = await apiRaw('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const cookies = loginRes.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
    const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
    const setCookie = getRes.headers.get('set-cookie') || ''
    const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
    const csrfToken = csrfMatch?.[1] || ''
    const cookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `Loc Tmpl Test ${Date.now()}` },
    })
    campaignId = camp.id

    const keyRes = await apiRaw('/api/apikeys', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'loc-tmpl-key' },
    })
    const keyData = await keyRes.json()
    apiKey = keyData.key
  })

  it('POST with templateId and fields stores them', async () => {
    const loc = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        name: 'Rivendell',
        subtype: 'city',
        templateId: 'tmpl-loc-123',
        fields: { climate: 'Temperate' },
      },
    })
    expect(loc.slug).toBeTruthy()

    const get = await api(`/api/campaigns/${campaignId}/locations/${loc.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(get.templateId).toBe('tmpl-loc-123')
    expect(get.fields.climate).toBe('Temperate')
    expect(get.subtype).toBe('city')
  })

  it('POST without templateId still succeeds', async () => {
    const loc = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Moria', subtype: 'dungeon' },
    })
    expect(loc.slug).toBeTruthy()

    const get = await api(`/api/campaigns/${campaignId}/locations/${loc.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(get.fields).toBeDefined()
    expect(typeof get.fields).toBe('object')
  })

  it('PUT with fields updates stored values and preserves subtype', async () => {
    const loc = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Gondor', subtype: 'country', fields: { climate: 'Tropical' } },
    })

    await api(`/api/campaigns/${campaignId}/locations/${loc.slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { fields: { climate: 'Arctic' } },
    })

    const get = await api(`/api/campaigns/${campaignId}/locations/${loc.slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(get.fields.climate).toBe('Arctic')
    expect(get.subtype).toBe('country')
  })
})
