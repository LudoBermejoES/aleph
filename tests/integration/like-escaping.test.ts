import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetApiKey(email: string) {
  await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name: 'Test', email, password: 'password123' },
  })
  const loginRes = await api('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password: 'password123' },
  })
  const cookies = loginRes.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  // Get CSRF token
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const fullCookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
  const keyRes = await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: fullCookie, 'X-CSRF-Token': csrfToken },
    body: { name: 'key' },
  })
  return (await keyRes.json()).key as string
}

describe('LIKE Wildcard Escaping (integration)', () => {
  const ts = Date.now()
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    apiKey = await signUpAndGetApiKey(`like-escape-${ts}@example.com`)
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Like Escape Test ${ts}` },
    })
    campaignId = (await camp.json()).id

    // Create entities with special characters in names
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Zak_the_Bold ${ts}`, type: 'character' },
    })
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `50% Done ${ts}`, type: 'lore' },
    })
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Other Entity ${ts}`, type: 'lore' },
    })
  })

  it('searching for _ does not match unrelated entities', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/entities?search=${encodeURIComponent(`Zak_the_Bold ${ts}`)}`,
      {
        headers: { 'X-API-Key': apiKey },
      },
    )
    const data = await res.json()
    const list = data.entities as { name: string }[]
    expect(Array.isArray(list)).toBe(true)
    // Should find Zak_the_Bold but not Other Entity
    expect(list.some((e) => e.name.includes('Zak_the_Bold'))).toBe(true)
    expect(list.every((e) => !e.name.includes('Other Entity'))).toBe(true)
  })

  it('searching for % does not match all entities', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/entities?search=${encodeURIComponent(`50% Done ${ts}`)}`,
      {
        headers: { 'X-API-Key': apiKey },
      },
    )
    const data = await res.json()
    const list = data.entities as { name: string }[]
    expect(Array.isArray(list)).toBe(true)
    // Should find "50% Done" but not "Other Entity"
    expect(list.some((e) => e.name.includes('50%'))).toBe(true)
    expect(list.every((e) => !e.name.includes('Other Entity'))).toBe(true)
  })
})
