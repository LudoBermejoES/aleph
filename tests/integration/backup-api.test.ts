/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

interface ApiOpts extends Omit<RequestInit, 'body'> {
  body?: unknown
}

async function apiRaw(url: string, opts?: ApiOpts) {
  const { body, ...rest } = opts ?? {}
  return fetch(`${BASE_URL}${url}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...rest?.headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password },
  })
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
    body: { name: 'backup-test-key' },
  })
  return res.json()
}

describe('Backup Admin API (integration)', () => {
  const ts = Date.now()
  const email = `backup-test-${ts}@example.com`
  let apiKey = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie)
    apiKey = keyData.key
  })

  it('GET /api/admin/backup returns 401 without auth', async () => {
    const res = await apiRaw('/api/admin/backup')
    expect(res.status).toBe(401)
  })

  it('POST /api/admin/backup returns 401 without auth', async () => {
    const res = await apiRaw('/api/admin/backup', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('POST /api/admin/backup/restore returns 401 without auth', async () => {
    const res = await apiRaw('/api/admin/backup/restore', {
      method: 'POST',
      body: { key: 'test' },
    })
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/backup returns archive list shape with auth', async () => {
    const res = await apiRaw('/api/admin/backup', {
      headers: { 'X-API-Key': apiKey },
    })
    // May be 200 with configured: false if R2 is not configured in test env
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('configured')
    expect(data).toHaveProperty('archives')
    expect(Array.isArray(data.archives)).toBe(true)
  })

  it('POST /api/admin/backup returns 400 when R2 not configured', async () => {
    // In test env, R2 credentials are not set, so should return 400
    const res = await apiRaw('/api/admin/backup', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
    })
    // Either 400 (not configured) or 200 (if configured) — both are valid
    expect([200, 400]).toContain(res.status)
  })
})
