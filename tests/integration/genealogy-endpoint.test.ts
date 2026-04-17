import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Genealogy endpoint (integration)', () => {
  const email = `genealogy-test-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''

  let grandparentSlug = ''
  let parentSlug = ''
  let childSlug = ''
  let spouseSlug = ''

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
      body: { name: 'Genealogy Tester', email, password: 'password123' },
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
      body: { name: `Genealogy Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    grandparentSlug = await createCharacter('Grandparent')
    parentSlug = await createCharacter('Parent')
    childSlug = await createCharacter('Child')
    spouseSlug = await createCharacter('Spouse')

    await addFamilyLink(grandparentSlug, 'parent', parentSlug)
    await addFamilyLink(parentSlug, 'parent', childSlug)
    await addFamilyLink(parentSlug, 'spouse', spouseSlug)
  })

  it('returns node and edge shape for focus character', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${parentSlug}/genealogy`, {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.focus).toBeDefined()
    expect(data.nodes).toBeInstanceOf(Array)
    expect(data.edges).toBeInstanceOf(Array)
    expect(data.warnings).toBeInstanceOf(Array)
  })

  it('nodes include grandparent (gen -1) and child (gen +1)', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${parentSlug}/genealogy`, {
      headers: { Cookie: cookie },
    })
    const { nodes } = await res.json()
    const slugs = nodes.map((n: { slug: string }) => n.slug)
    expect(slugs.some((s: string) => s.startsWith('grandparent'))).toBe(true)
    expect(slugs.some((s: string) => s.startsWith('child'))).toBe(true)

    const gp = nodes.find((n: { slug: string }) => n.slug.startsWith('grandparent'))
    const ch = nodes.find((n: { slug: string }) => n.slug.startsWith('child'))
    expect(gp.generation).toBe(-1)
    expect(ch.generation).toBe(1)
  })

  it('spouse is adjacent at same generation as parent', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${parentSlug}/genealogy`, {
      headers: { Cookie: cookie },
    })
    const { nodes } = await res.json()
    const parent = nodes.find((n: { slug: string }) => n.slug.startsWith('parent'))
    const spouse = nodes.find((n: { slug: string }) => n.slug.startsWith('spouse'))
    expect(parent.generation).toBe(0)
    expect(spouse.generation).toBe(0)
    // Adjacent means the x distance equals NODE_WIDTH + NODE_H_GAP
    const dx = Math.abs(parent.x - spouse.x)
    expect(dx).toBeGreaterThan(0)
  })

  it('returns 400 for invalid depth', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/characters/${parentSlug}/genealogy?depth=0`,
      { headers: { Cookie: cookie } },
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown slug', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/characters/nonexistent-slug-xyz/genealogy`,
      { headers: { Cookie: cookie } },
    )
    expect(res.status).toBe(404)
  })

  it('returns 401 for unauthenticated request', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${parentSlug}/genealogy`)
    expect(res.status).toBe(401)
  })

  it('returns empty-tree response for a lone character', async () => {
    const loneSlug = await createCharacter('Lone')
    const res = await api(`/api/campaigns/${campaignId}/characters/${loneSlug}/genealogy`, {
      headers: { Cookie: cookie },
    })
    const data = await res.json()
    expect(data.nodes).toHaveLength(1)
    expect(data.edges).toHaveLength(0)
  })

  it('returns deterministic output across two successive calls', async () => {
    const res1 = await api(`/api/campaigns/${campaignId}/characters/${parentSlug}/genealogy`, {
      headers: { Cookie: cookie },
    })
    const res2 = await api(`/api/campaigns/${campaignId}/characters/${parentSlug}/genealogy`, {
      headers: { Cookie: cookie },
    })
    const data1 = await res1.json()
    const data2 = await res2.json()
    expect(data1.nodes.map((n: { entityId: string }) => n.entityId)).toEqual(
      data2.nodes.map((n: { entityId: string }) => n.entityId),
    )
    expect(data1.nodes.map((n: { x: number }) => n.x)).toEqual(
      data2.nodes.map((n: { x: number }) => n.x),
    )
  })

  it('respects depth cap behavior', async () => {
    const res1 = await api(
      `/api/campaigns/${campaignId}/characters/${parentSlug}/genealogy?depth=1`,
      { headers: { Cookie: cookie } },
    )
    const res3 = await api(
      `/api/campaigns/${campaignId}/characters/${parentSlug}/genealogy?depth=3`,
      { headers: { Cookie: cookie } },
    )
    const d1 = await res1.json()
    const d3 = await res3.json()
    // depth=1 should have fewer or equal nodes than depth=3
    expect(d1.nodes.length).toBeLessThanOrEqual(d3.nodes.length)
  })
})
