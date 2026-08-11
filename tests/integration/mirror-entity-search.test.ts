/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Regression cover for a real bug found in production: organization, session,
 * quest, and arc "mirror entities" (server/db/backfills/{session,quest,arc}-
 * entities.ts, and organizations' original creation flow) were only ever
 * inserted into the `entities` table — none of the create/update/delete
 * routes for these four types ever called indexEntity(), so they were never
 * findable via lexical search at all, for as long as these features existed.
 * Confirmed on production: 224 sessions, 75 organizations, 14 arcs, and 14
 * quests were missing from the FTS5 index.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, password: string) {
  await apiRaw('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name: 'Mirror Search Test', email, password },
  })
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

async function createApiKey(cookie: string) {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name: 'mirror-search-key' },
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

async function searchNames(campaignId: string, apiKey: string, q: string): Promise<string[]> {
  const res = await apiRaw(`/api/campaigns/${campaignId}/search?q=${encodeURIComponent(q)}`, {
    headers: { 'X-API-Key': apiKey },
  })
  const data = await res.json()
  return (data.results || []).map((r: { name: string }) => r.name)
}

describe('Mirror entities are searchable (integration)', () => {
  const email = `mirror-search-${Date.now()}@example.com`
  const password = 'password123'
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email, password)
    const keyData = await createApiKey(cookie)
    apiKey = keyData.key
    const campaign = await createCampaign(apiKey, `Mirror Search Campaign ${Date.now()}`)
    campaignId = campaign.id
  })

  it('finds a newly-created organization by a distinctive word in its description', async () => {
    await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'The Silent Order', description: 'A cabal that worships the Xyphrastine.' },
    })

    const names = await searchNames(campaignId, apiKey, 'Xyphrastine')
    expect(names).toContain('The Silent Order')
  })

  it('finds a newly-created session by a distinctive word in its content', async () => {
    await apiRaw(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'The Asylum and the Hammer', content: 'They fought the Grondellathorn.' },
    })

    const names = await searchNames(campaignId, apiKey, 'Grondellathorn')
    expect(names).toContain('The Asylum and the Hammer')
  })

  it('finds a newly-created quest by a distinctive word in its content', async () => {
    await apiRaw(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Retrieve the Relic', content: 'Hidden beneath the Vazhkolomir.' },
    })

    const names = await searchNames(campaignId, apiKey, 'Vazhkolomir')
    expect(names).toContain('Retrieve the Relic')
  })

  it('finds a newly-created arc by a distinctive word in its description', async () => {
    await apiRaw(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'The Hollow Crown', description: 'A war against the Threnzikar.' },
    })

    const names = await searchNames(campaignId, apiKey, 'Threnzikar')
    expect(names).toContain('The Hollow Crown')
  })

  it('finds an updated organization by a word only present after the edit', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'The Iron Guild', description: 'Blacksmiths and traders.' },
    })
    const org = await res.json()

    await apiRaw(`/api/campaigns/${campaignId}/organizations/${org.slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { description: 'Secretly serves the Umbrathex.' },
    })

    const names = await searchNames(campaignId, apiKey, 'Umbrathex')
    expect(names).toContain('The Iron Guild')
  })

  it('no longer finds a deleted quest', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/quests`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Find the Deletable Quest', content: 'Involves the Skarnathrax.' },
    })
    const quest = await res.json()

    await apiRaw(`/api/campaigns/${campaignId}/quests/${quest.slug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })

    const names = await searchNames(campaignId, apiKey, 'Skarnathrax')
    expect(names).not.toContain('Find the Deletable Quest')
  })
})
