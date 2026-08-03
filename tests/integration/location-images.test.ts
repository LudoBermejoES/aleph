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

// A real 1×1 PNG — the magic-byte check rejects anything less.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

function pngForm(caption?: string, type = 'image/png', name = 'cover.png') {
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

describe('Location image gallery (integration)', () => {
  const ts = Date.now()
  let dmKey = ''
  let dmCookie = ''
  let playerCookie = ''
  let campaignId = ''
  let slug = ''
  let otherSlug = ''

  async function createLocation(name: string, body: Record<string, unknown> = {}) {
    const res = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name, subtype: 'city', ...body },
    })
    expect(res.status).toBe(200)
    return (await res.json()).slug as string
  }

  async function listImages(target = slug): Promise<GalleryImage[]> {
    const res = await api(`/api/campaigns/${campaignId}/locations/${target}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    return res.json()
  }

  async function upload(target = slug, caption?: string) {
    const res = await api(`/api/campaigns/${campaignId}/locations/${target}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(caption),
    })
    expect(res.status).toBe(201)
    return (await res.json()) as GalleryImage
  }

  async function locationDetail(target = slug) {
    const res = await api(`/api/campaigns/${campaignId}/locations/${target}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    return res.json()
  }

  beforeAll(async () => {
    dmCookie = await signUpAndGetCookie(`loc-img-dm-${ts}@example.com`, 'Gallery DM')
    dmKey = await createApiKey(dmCookie, `gallery-dm-${ts}`)
    playerCookie = await signUpAndGetCookie(`loc-img-player-${ts}@example.com`, 'Gallery Player')

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: asUser(dmCookie),
      body: { name: `Gallery Test ${ts}` },
    })
    campaignId = (await camp.json()).id

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { role: 'player' },
    })
    const { token } = await invite.json()
    const join = await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: asUser(playerCookie),
      body: { token },
    })
    expect(join.status).toBe(200)

    slug = await createLocation(`Waterdeep ${ts}`)
    otherSlug = await createLocation(`Neverwinter ${ts}`)
  })

  // ── Listing ───────────────────────────────────────────────────────────────

  it('an empty gallery is [] with 200, not 404', async () => {
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('rejects an unauthenticated list', async () => {
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images`)
    expect(res.status).toBe(401)
  })

  it('404s for a location that does not exist', async () => {
    const res = await api(`/api/campaigns/${campaignId}/locations/no-such-place/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(404)
  })

  // ── Upload ────────────────────────────────────────────────────────────────

  it('the first upload is primary and mirrors into imageUrl', async () => {
    const image = await upload(slug, 'The harbour')

    expect(image.isPrimary).toBe(true)
    expect(image.sortOrder).toBe(0)
    expect(image.caption).toBe('The harbour')

    const detail = await locationDetail()
    expect(detail.primaryImageUrl).toBe(image.url)
    expect(detail.imageUrl).toBe(image.url)
    expect(detail.images).toHaveLength(1)
  })

  it('a second upload appends without stealing primary', async () => {
    const before = await listImages()
    const image = await upload()

    expect(image.isPrimary).toBe(false)
    expect(image.sortOrder).toBeGreaterThan(before[before.length - 1]!.sortOrder)

    const detail = await locationDetail()
    expect(detail.primaryImageUrl).toBe(before.find((i) => i.isPrimary)!.url)
  })

  it('uploading the same filename twice keeps both images', async () => {
    const a = await upload()
    const b = await upload()

    expect(a.id).not.toBe(b.id)
    const ids = (await listImages()).map((i) => i.id)
    expect(ids).toContain(a.id)
    expect(ids).toContain(b.id)
  })

  it('rejects a disallowed MIME type with 400', async () => {
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(undefined, 'image/gif', 'cover.gif'),
    })
    expect(res.status).toBe(400)
  })

  it('rejects content that does not match the declared type with 400', async () => {
    const form = new FormData()
    form.append('image', new Blob([Buffer.from('not an image')], { type: 'image/png' }), 'x.png')
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: form,
    })
    expect(res.status).toBe(400)
  })

  it('rejects an upload from a player with 403', async () => {
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images`, {
      method: 'POST',
      headers: asUser(playerCookie),
      body: pngForm(),
    })
    expect(res.status).toBe(403)
  })

  it('rejects an unauthenticated upload with 401', async () => {
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images`, {
      method: 'POST',
      body: pngForm(),
    })
    expect(res.status).toBe(401)
  })

  // ── Serving ───────────────────────────────────────────────────────────────

  it('serves the bytes with a long cache header', async () => {
    const [image] = await listImages()
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${image!.id}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/')
    expect(res.headers.get('cache-control')).toContain('max-age=31536000')
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  it('404s an unknown image id', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/locations/${slug}/images/00000000-0000-0000-0000-000000000000`,
      { headers: { 'X-API-Key': dmKey } },
    )
    expect(res.status).toBe(404)
  })

  it('404s an image id belonging to a DIFFERENT location', async () => {
    const foreign = await upload(otherSlug)

    for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
      const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${foreign.id}`, {
        method,
        headers: { 'X-API-Key': dmKey },
        body: method === 'PATCH' ? { caption: 'hijacked' } : undefined,
      })
      expect(res.status, `${method} should not reach another location's image`).toBe(404)
    }

    // …and the foreign image is untouched.
    const stillThere = await listImages(otherSlug)
    expect(stillThere.find((i) => i.id === foreign.id)?.caption ?? null).toBeNull()
  })

  it('rejects an unauthenticated image request', async () => {
    const [image] = await listImages()
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${image!.id}`)
    expect(res.status).toBe(401)
  })

  // ── Choosing the main image ───────────────────────────────────────────────

  it('promotes another image to primary and moves the mirror', async () => {
    const images = await listImages()
    const target = images.find((i) => !i.isPrimary)!

    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${target.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { isPrimary: true },
    })
    expect(res.status).toBe(200)

    const after = await listImages()
    expect(after.filter((i) => i.isPrimary).map((i) => i.id)).toEqual([target.id])
    expect((await locationDetail()).imageUrl).toBe(target.url)
  })

  it('refuses to unset the main image', async () => {
    const primary = (await listImages()).find((i) => i.isPrimary)!
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${primary.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { isPrimary: false },
    })
    expect(res.status).toBe(400)
    expect((await listImages()).find((i) => i.id === primary.id)!.isPrimary).toBe(true)
  })

  it('edits a caption without disturbing primacy or order', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${image.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { caption: 'The cellar door' },
    })
    expect(res.status).toBe(200)
    const updated = await res.json()
    expect(updated.caption).toBe('The cellar door')
    expect(updated.isPrimary).toBe(image.isPrimary)
    expect(updated.sortOrder).toBe(image.sortOrder)
  })

  it('reorders an image', async () => {
    const images = await listImages()
    const first = images[0]!
    const last = images[images.length - 1]!
    expect(first.sortOrder).toBeLessThan(last.sortOrder)

    // The swap the UI performs: two PATCHes exchanging the two sort orders.
    for (const [id, sortOrder] of [
      [last.id, first.sortOrder],
      [first.id, last.sortOrder],
    ] as const) {
      const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${id}`, {
        method: 'PATCH',
        headers: { 'X-API-Key': dmKey },
        body: { sortOrder },
      })
      expect(res.status).toBe(200)
    }

    const after = await listImages()
    expect(after[0]!.id).toBe(last.id)
    expect(after[after.length - 1]!.id).toBe(first.id)
  })

  it('rejects a negative sortOrder with 422', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${image.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { sortOrder: -1 },
    })
    expect(res.status).toBe(422)
  })

  it('rejects a PATCH from a player with 403 and unauthenticated with 401', async () => {
    const image = (await listImages())[0]!
    const path = `/api/campaigns/${campaignId}/locations/${slug}/images/${image.id}`

    const asPlayer = await api(path, {
      method: 'PATCH',
      headers: asUser(playerCookie),
      body: { caption: 'nope' },
    })
    expect(asPlayer.status).toBe(403)

    const anon = await api(path, { method: 'PATCH', body: { caption: 'nope' } })
    expect(anon.status).toBe(401)
  })

  // ── Deleting ──────────────────────────────────────────────────────────────

  it('rejects a DELETE from a player with 403 and unauthenticated with 401', async () => {
    const image = (await listImages())[0]!
    const path = `/api/campaigns/${campaignId}/locations/${slug}/images/${image.id}`

    expect((await api(path, { method: 'DELETE', headers: asUser(playerCookie) })).status).toBe(403)
    expect((await api(path, { method: 'DELETE' })).status).toBe(401)
  })

  it('deleting the primary promotes the lowest-sortOrder survivor', async () => {
    const before = await listImages()
    const primary = before.find((i) => i.isPrimary)!
    const expectedNext = before.filter((i) => i.id !== primary.id)[0]!

    const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${primary.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(204)

    const after = await listImages()
    expect(after.map((i) => i.id)).not.toContain(primary.id)
    expect(after.find((i) => i.isPrimary)!.id).toBe(expectedNext.id)
    expect((await locationDetail()).imageUrl).toBe(expectedNext.url)
  })

  it('emptying the gallery nulls the location imageUrl', async () => {
    for (const image of await listImages()) {
      const res = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${image.id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': dmKey },
      })
      expect(res.status).toBe(204)
    }

    expect(await listImages()).toEqual([])
    const detail = await locationDetail()
    expect(detail.imageUrl).toBeNull()
    expect(detail.primaryImageUrl).toBeNull()
  })

  // ── The single-writer rule ────────────────────────────────────────────────

  it('an upload through the ENTITY image route lands in the gallery as primary', async () => {
    const target = await createLocation(`Baldurs Gate ${ts}`)

    const res = await api(`/api/campaigns/${campaignId}/entities/${target}/image`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(),
    })
    expect(res.status).toBe(200)
    const { imageUrl } = await res.json()

    // The URL is the gallery's, not the legacy /entities/:slug/image path.
    expect(imageUrl).toContain(`/locations/${target}/images/`)

    const images = await listImages(target)
    expect(images).toHaveLength(1)
    expect(images[0]!.isPrimary).toBe(true)
    expect(images[0]!.url).toBe(imageUrl)
    expect((await locationDetail(target)).imageUrl).toBe(imageUrl)
  })

  it('the entity route on a location with a gallery adds and promotes, never replaces', async () => {
    const target = await createLocation(`Neverwinter Wood ${ts}`)
    const a = await upload(target)
    const b = await upload(target)

    const res = await api(`/api/campaigns/${campaignId}/entities/${target}/image`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(),
    })
    expect(res.status).toBe(200)
    const { imageUrl } = await res.json()

    const images = await listImages(target)
    expect(images).toHaveLength(3)
    expect(images.map((i) => i.id)).toEqual(expect.arrayContaining([a.id, b.id]))
    expect(images.find((i) => i.isPrimary)!.url).toBe(imageUrl)
    expect(images.find((i) => i.id === a.id)!.isPrimary).toBe(false)
  })

  it('a non-location entity keeps the legacy single-image behaviour', async () => {
    const created = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Plain Entity ${ts}`, type: 'item' },
    })
    expect(created.status).toBe(200)
    const entitySlug = (await created.json()).slug

    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/image`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).imageUrl).toBe(
      `/api/campaigns/${campaignId}/entities/${entitySlug}/image`,
    )
  })

  // ── The list endpoint ─────────────────────────────────────────────────────

  it('the location list returns imageUrl', async () => {
    const target = await createLocation(`Candlekeep ${ts}`)
    const image = await upload(target)

    const res = await api(`/api/campaigns/${campaignId}/locations?pageSize=0`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const rows = Array.isArray(body) ? body : body.data

    const withImage = rows.find((l: Record<string, unknown>) => l.slug === target)
    expect(withImage.imageUrl).toBe(image.url)

    const withoutImage = rows.find((l: Record<string, unknown>) => l.slug === otherSlug)
    expect('imageUrl' in withoutImage).toBe(true)
  })
})
