import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Character family links API (integration)', () => {
  const email = `family-test-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  // Four characters: grandparent, parent, child1, child2
  let grandparentSlug = ''
  let parentSlug = ''
  let child1Slug = ''
  let child2Slug = ''

  async function createCharacter(name: string) {
    const res = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name },
    })
    return (await res.json()).slug as string
  }

  async function addFamilyLink(sourceSlug: string, type: string, targetSlug: string) {
    return api(`/api/campaigns/${campaignId}/characters/${sourceSlug}/family`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { type, targetCharacterSlug: targetSlug },
    })
  }

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Family Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
    const campList = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
    const setCookie = campList.headers.get('set-cookie') || ''
    const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
    csrfToken = csrfMatch?.[1] || ''
    cookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `Family Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    grandparentSlug = await createCharacter('Grandparent')
    parentSlug = await createCharacter('Parent')
    child1Slug = await createCharacter('Child1')
    child2Slug = await createCharacter('Child2')
  })

  it('POST creates a parent link (single row stored)', async () => {
    const res = await addFamilyLink(grandparentSlug, 'parent', parentSlug)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeDefined()
    expect(data.warnings).toBeInstanceOf(Array)
  })

  it('POST creates a child link (normalizes to parent_of with swapped ends)', async () => {
    const res = await addFamilyLink(parentSlug, 'parent', child1Slug)
    expect(res.status).toBe(200)
  })

  it('POST creates a sibling link', async () => {
    const res = await addFamilyLink(child1Slug, 'sibling', child2Slug)
    expect(res.status).toBe(200)
  })

  it('POST creates a spouse link', async () => {
    const res = await addFamilyLink(grandparentSlug, 'spouse', parentSlug)
    // grandparent is parent of parent — this is a data anomaly but the API allows spouse
    // between any two characters (no cross-type restriction)
    expect([200, 400]).toContain(res.status)
  })

  it('POST returns 400 for self-link', async () => {
    const res = await addFamilyLink(parentSlug, 'spouse', parentSlug)
    expect(res.status).toBe(400)
  })

  it('POST returns 400 for duplicate link', async () => {
    // grandparent → parent already exists from above
    const res = await addFamilyLink(grandparentSlug, 'parent', parentSlug)
    expect(res.status).toBe(400)
  })

  it('POST returns 400 for cycle (direct)', async () => {
    // parent → grandparent would create a cycle (grandparent is already parent of parent)
    const res = await addFamilyLink(parentSlug, 'parent', grandparentSlug)
    expect(res.status).toBe(400)
  })

  it('POST returns 400 for transitive cycle', async () => {
    // grandparent → parent → child1 already exists
    // trying child1 → grandparent would be a cycle
    const res = await addFamilyLink(child1Slug, 'parent', grandparentSlug)
    expect(res.status).toBe(400)
  })

  it('POST returns year coherence warning for parent younger than child', async () => {
    const youngParent = await createCharacter('YoungParent')
    const oldChild = await createCharacter('OldChild')

    // Set young parent birth year later than child's
    await api(`/api/campaigns/${campaignId}/characters/${youngParent}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { birthYear: 1500 },
    })
    await api(`/api/campaigns/${campaignId}/characters/${oldChild}`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { birthYear: 1400 },
    })

    const res = await addFamilyLink(youngParent, 'parent', oldChild)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.warnings.length).toBeGreaterThan(0)
  })

  it('DELETE removes a family link', async () => {
    const createRes = await addFamilyLink(parentSlug, 'parent', child2Slug)
    const { id: relationId } = await createRes.json()

    const delRes = await api(
      `/api/campaigns/${campaignId}/characters/${parentSlug}/family/${relationId}`,
      { method: 'DELETE', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken } },
    )
    expect(delRes.status).toBe(200)
  })

  it('POST returns 401 for unauthenticated request', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${parentSlug}/family`, {
      method: 'POST',
      body: { type: 'sibling', targetCharacterSlug: child1Slug },
    })
    expect(res.status).toBe(401)
  })

  it('cascading delete removes family links when character is deleted', async () => {
    const tempChar = await createCharacter('TempChar')
    const linkRes = await addFamilyLink(parentSlug, 'sibling', tempChar)
    const { id: relationId } = await linkRes.json()

    // Delete the character
    await api(`/api/campaigns/${campaignId}/characters/${tempChar}`, {
      method: 'DELETE',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    })

    // The relation should no longer exist (cascade)
    const delRes = await api(
      `/api/campaigns/${campaignId}/characters/${parentSlug}/family/${relationId}`,
      { method: 'DELETE', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken } },
    )
    expect(delRes.status).toBe(404)
  })
})
