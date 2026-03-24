import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Dice Roll API (integration)', () => {
  const email = `dice-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Dice Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Dice Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
  })

  it('POST /roll with valid formula returns RollResult', async () => {
    const res = await api(`/api/campaigns/${campaignId}/roll`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { formula: '2d6+4' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.total).toBeGreaterThanOrEqual(6) // min 1+1+4
    expect(data.total).toBeLessThanOrEqual(16) // max 6+6+4
    expect(data.formula).toBe('2d6+4')
    expect(data.rolls).toBeDefined()
    expect(data.rolls[0].values).toHaveLength(2)
  })

  it('POST /roll with invalid formula returns 400', async () => {
    const res = await api(`/api/campaigns/${campaignId}/roll`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { formula: 'not a formula' },
    })
    expect(res.status).toBe(400)
  })

  it('POST /roll with d20 returns 1-20', async () => {
    const res = await api(`/api/campaigns/${campaignId}/roll`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { formula: 'd20' },
    })
    const data = await res.json()
    expect(data.total).toBeGreaterThanOrEqual(1)
    expect(data.total).toBeLessThanOrEqual(20)
  })

  it('POST /roll with 4d6kh3 returns valid result', async () => {
    const res = await api(`/api/campaigns/${campaignId}/roll`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { formula: '4d6kh3' },
    })
    const data = await res.json()
    expect(data.total).toBeGreaterThanOrEqual(3) // min 1+1+1
    expect(data.total).toBeLessThanOrEqual(18) // max 6+6+6
    expect(data.rolls[0].kept).toHaveLength(3)
    expect(data.rolls[0].dropped).toHaveLength(1)
  })
})
