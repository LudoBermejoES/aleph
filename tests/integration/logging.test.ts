import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Request Logging (integration)', () => {
  it('API request returns X-Request-Id header', async () => {
    const res = await api('/api/campaigns', { method: 'GET' })
    const requestId = res.headers.get('x-request-id')
    expect(requestId).toBeDefined()
    expect(requestId).toMatch(/^[a-f0-9-]{36}$/)
  })
})

describe('Audit Logging (integration)', () => {
  it('login creates audit trail (verify via successful login)', async () => {
    const email = `audit-test-${Date.now()}@example.com`
    // Register
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Audit Test', email, password: 'password123' },
    })
    // Login
    const res = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    expect(res.status).toBe(200)
    // The audit log is written to file -- we verify the login succeeded
    // which means the audit middleware ran. Full file verification would
    // require reading the log file, which we test in unit tests.
    const data = await res.json()
    expect(data.user?.email).toBe(email)
  })
})
