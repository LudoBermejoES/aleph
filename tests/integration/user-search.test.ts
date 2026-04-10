import { describe, it, expect, beforeAll } from 'vitest'
import { signUpAndLogin, apiRaw } from './helpers'

describe('User search (integration)', () => {
  const dmEmail = `search-dm-${Date.now()}@example.com`
  const targetEmail = `search-target-${Date.now()}@example.com`
  const targetName = `SearchTarget${Date.now()}`
  let dmCookie = ''

  beforeAll(async () => {
    const dm = await signUpAndLogin(dmEmail, 'password123', 'Search DM')
    dmCookie = dm.cookie
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: targetName, email: targetEmail, password: 'password123' },
    })
  })

  it('returns users matching name query', async () => {
    const res = await apiRaw(`/api/users/search?q=${encodeURIComponent(targetName)}`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    const match = data.find((u: { name: string }) => u.name === targetName)
    expect(match).toBeDefined()
    expect(match.id).toBeDefined()
    expect(match.email).toMatch(/^\w\*{3}@/)
  })

  it('returns user on exact email match with redacted email', async () => {
    const res = await apiRaw(`/api/users/search?q=${encodeURIComponent(targetEmail)}`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(data[0].email).toMatch(/^\w\*{3}@/)
  })

  it('returns empty array when no match', async () => {
    const res = await apiRaw('/api/users/search?q=zzznomatchxxx999', {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual([])
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await apiRaw('/api/users/search?q=test')
    expect(res.status).toBe(401)
  })

  it('returns 400 when q is missing', async () => {
    const res = await apiRaw('/api/users/search', {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(400)
  })
})
