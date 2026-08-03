import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const isFormData = opts?.body instanceof FormData
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Origin: BASE_URL,
      ...opts?.headers,
    },
    body: isFormData
      ? opts?.body
      : opts?.body !== undefined
        ? JSON.stringify(opts.body)
        : undefined,
  })
}

async function signUpAndGetCookie(email: string, name: string, password = 'password123') {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfToken = (setCookie.match(/csrf_token=([^;]+)/) || [])[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

function csrfOf(cookie: string) {
  return (cookie.match(/csrf_token=([^;]+)/) || [])[1] || ''
}

function asUser(cookie: string) {
  return { Cookie: cookie, 'X-CSRF-Token': csrfOf(cookie) }
}

async function createApiKey(cookie: string, name: string) {
  const res = await api('/api/apikeys', { method: 'POST', headers: asUser(cookie), body: { name } })
  return (await res.json()).key as string
}

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

function pngForm(caption?: string, type = 'image/png', name = 'banner.png') {
  const form = new FormData()
  form.append('image', new Blob([PNG_1PX], { type }), name)
  if (caption !== undefined) form.append('caption', caption)
  return form
}

interface GalleryImage {
  id: string
  url: string
  caption: string | null
  sortOrder: number
  isPrimary: boolean
}

describe('Organization image gallery (integration)', () => {
  const ts = Date.now()
  let dmKey = ''
  let dmCookie = ''
  let playerCookie = ''
  let campaignId = ''
  let slug = ''
  let otherSlug = ''

  async function createOrg(name: string) {
    const res = await api(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name, type: 'faction' },
    })
    expect(res.status).toBe(200)
    return (await res.json()).slug as string
  }

  async function listImages(target = slug): Promise<GalleryImage[]> {
    const res = await api(`/api/campaigns/${campaignId}/organizations/${target}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    return res.json()
  }

  async function upload(target = slug, caption?: string) {
    const res = await api(`/api/campaigns/${campaignId}/organizations/${target}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(caption),
    })
    expect(res.status).toBe(201)
    return (await res.json()) as GalleryImage
  }

  async function orgDetail(target = slug) {
    const res = await api(`/api/campaigns/${campaignId}/organizations/${target}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    return res.json()
  }

  beforeAll(async () => {
    dmCookie = await signUpAndGetCookie(`org-img-dm-${ts}@example.com`, 'Org Gallery DM')
    dmKey = await createApiKey(dmCookie, `org-gallery-dm-${ts}`)
    playerCookie = await signUpAndGetCookie(
      `org-img-player-${ts}@example.com`,
      'Org Gallery Player',
    )

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: asUser(dmCookie),
      body: { name: `Org Gallery Test ${ts}` },
    })
    campaignId = (await camp.json()).id

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { role: 'player' },
    })
    const { token } = await invite.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: asUser(playerCookie),
      body: { token },
    })

    slug = await createOrg(`Fellowship ${ts}`)
    otherSlug = await createOrg(`Mordor ${ts}`)
  })

  // ── Listing ───────────────────────────────────────────────────────────────

  it('empty gallery returns [] with 200', async () => {
    const res = await api(`/api/campaigns/${campaignId}/organizations/${slug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('unauthenticated list returns 401', async () => {
    const res = await api(`/api/campaigns/${campaignId}/organizations/${slug}/images`)
    expect(res.status).toBe(401)
  })

  it('non-existent organization returns 404', async () => {
    const res = await api(`/api/campaigns/${campaignId}/organizations/no-such-org/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(404)
  })

  // ── Upload ────────────────────────────────────────────────────────────────

  it('first upload is primary and mirrors into imageUrl', async () => {
    const image = await upload(slug, 'The fellowship banner')

    expect(image.isPrimary).toBe(true)
    expect(image.sortOrder).toBe(0)
    expect(image.caption).toBe('The fellowship banner')

    const detail = await orgDetail()
    expect(detail.imageUrl).toBe(image.url)
  })

  it('second upload appends without stealing primary', async () => {
    const before = await listImages()
    const image = await upload()

    expect(image.isPrimary).toBe(false)
    expect((await orgDetail()).imageUrl).toBe(before.find((i) => i.isPrimary)!.url)
  })

  it('rejects a disallowed MIME type with 400', async () => {
    const res = await api(`/api/campaigns/${campaignId}/organizations/${slug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(undefined, 'image/gif', 'banner.gif'),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a player upload with 403', async () => {
    const res = await api(`/api/campaigns/${campaignId}/organizations/${slug}/images`, {
      method: 'POST',
      headers: asUser(playerCookie),
      body: pngForm(),
    })
    expect(res.status).toBe(403)
  })

  // ── Serving ───────────────────────────────────────────────────────────────

  it('serves bytes with a long cache header', async () => {
    const [image] = await listImages()
    const res = await api(
      `/api/campaigns/${campaignId}/organizations/${slug}/images/${image!.id}`,
      {
        headers: { 'X-API-Key': dmKey },
      },
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/')
    expect(res.headers.get('cache-control')).toContain('max-age=31536000')
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  it('404s an unknown image id', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/organizations/${slug}/images/00000000-0000-0000-0000-000000000000`,
      { headers: { 'X-API-Key': dmKey } },
    )
    expect(res.status).toBe(404)
  })

  it('404s an image id belonging to a different organization', async () => {
    const foreign = await upload(otherSlug)

    for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
      const res = await api(
        `/api/campaigns/${campaignId}/organizations/${slug}/images/${foreign.id}`,
        {
          method,
          headers: { 'X-API-Key': dmKey },
          body: method === 'PATCH' ? { caption: 'hijacked' } : undefined,
        },
      )
      expect(res.status, `${method} should not reach another org's image`).toBe(404)
    }
  })

  // ── Choosing the main image ───────────────────────────────────────────────

  it('promotes another image to primary and moves the imageUrl mirror', async () => {
    const images = await listImages()
    const target = images.find((i) => !i.isPrimary)!

    const res = await api(
      `/api/campaigns/${campaignId}/organizations/${slug}/images/${target.id}`,
      {
        method: 'PATCH',
        headers: { 'X-API-Key': dmKey },
        body: { isPrimary: true },
      },
    )
    expect(res.status).toBe(200)

    const after = await listImages()
    expect(after.filter((i) => i.isPrimary).map((i) => i.id)).toEqual([target.id])
    expect((await orgDetail()).imageUrl).toBe(target.url)
  })

  it('refuses to unset the primary image', async () => {
    const primary = (await listImages()).find((i) => i.isPrimary)!
    const res = await api(
      `/api/campaigns/${campaignId}/organizations/${slug}/images/${primary.id}`,
      {
        method: 'PATCH',
        headers: { 'X-API-Key': dmKey },
        body: { isPrimary: false },
      },
    )
    expect(res.status).toBe(400)
  })

  it('edits a caption without disturbing primacy', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/organizations/${slug}/images/${image.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { caption: 'Updated banner' },
    })
    expect(res.status).toBe(200)
    expect((await res.json()).caption).toBe('Updated banner')
  })

  // ── Deleting ──────────────────────────────────────────────────────────────

  it('deleting the primary promotes the lowest-sortOrder survivor', async () => {
    const before = await listImages()
    const primary = before.find((i) => i.isPrimary)!
    const expectedNext = before
      .filter((i) => i.id !== primary.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0]!

    const res = await api(
      `/api/campaigns/${campaignId}/organizations/${slug}/images/${primary.id}`,
      {
        method: 'DELETE',
        headers: { 'X-API-Key': dmKey },
      },
    )
    expect(res.status).toBe(204)

    const after = await listImages()
    expect(after.find((i) => i.isPrimary)!.id).toBe(expectedNext.id)
    expect((await orgDetail()).imageUrl).toBe(expectedNext.url)
  })

  it('emptying the gallery nulls imageUrl', async () => {
    for (const image of await listImages()) {
      const res = await api(
        `/api/campaigns/${campaignId}/organizations/${slug}/images/${image.id}`,
        {
          method: 'DELETE',
          headers: { 'X-API-Key': dmKey },
        },
      )
      expect(res.status).toBe(204)
    }

    expect(await listImages()).toEqual([])
    expect((await orgDetail()).imageUrl).toBeNull()
  })

  // ── image.post.ts (task 10.4) ─────────────────────────────────────────────

  it('image.post.ts creates a gallery row and mirrors imageUrl', async () => {
    const org = await createOrg(`Rivendell ${ts}`)

    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/png' }), 'rivendell.png')

    const res = await api(`/api/campaigns/${campaignId}/organizations/${org}/image`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: form,
    })
    expect(res.status).toBe(200)
    const { imageUrl } = await res.json()
    expect(imageUrl).toContain(`/organizations/${org}/images/`)

    const r = await api(`/api/campaigns/${campaignId}/organizations/${org}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    const images: GalleryImage[] = await r.json()
    expect(images).toHaveLength(1)
    expect(images[0]!.isPrimary).toBe(true)
    expect(images[0]!.url).toBe(imageUrl)

    const detail = await api(`/api/campaigns/${campaignId}/organizations/${org}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect((await detail.json()).imageUrl).toBe(imageUrl)
  })

  it('image.post.ts on an org with an existing gallery promotes the new image', async () => {
    const org = await createOrg(`Rohan ${ts}`)

    // Seed the gallery
    await api(`/api/campaigns/${campaignId}/organizations/${org}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(),
    })

    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/png' }), 'rohan-new.png')
    const res = await api(`/api/campaigns/${campaignId}/organizations/${org}/image`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: form,
    })
    expect(res.status).toBe(200)
    const { imageUrl } = await res.json()

    const r = await api(`/api/campaigns/${campaignId}/organizations/${org}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    const images: GalleryImage[] = await r.json()
    expect(images).toHaveLength(2)
    expect(images.find((i) => i.isPrimary)!.url).toBe(imageUrl)
  })
})
