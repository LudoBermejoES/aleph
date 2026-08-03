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

function pngForm(caption?: string, type = 'image/png', name = 'portrait.png') {
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

describe('Character image gallery (integration)', () => {
  const ts = Date.now()
  let dmKey = ''
  let dmCookie = ''
  let playerCookie = ''
  let campaignId = ''
  let slug = ''
  let otherSlug = ''

  async function createCharacter(name: string) {
    const res = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name, characterType: 'npc' },
    })
    expect(res.status).toBe(200)
    return (await res.json()).slug as string
  }

  async function listImages(target = slug): Promise<GalleryImage[]> {
    const res = await api(`/api/campaigns/${campaignId}/characters/${target}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    return res.json()
  }

  async function upload(target = slug, caption?: string) {
    const res = await api(`/api/campaigns/${campaignId}/characters/${target}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(caption),
    })
    expect(res.status).toBe(201)
    return (await res.json()) as GalleryImage
  }

  async function characterDetail(target = slug) {
    const res = await api(`/api/campaigns/${campaignId}/characters/${target}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    return res.json()
  }

  beforeAll(async () => {
    dmCookie = await signUpAndGetCookie(`char-img-dm-${ts}@example.com`, 'Char Gallery DM')
    dmKey = await createApiKey(dmCookie, `char-gallery-dm-${ts}`)
    playerCookie = await signUpAndGetCookie(
      `char-img-player-${ts}@example.com`,
      'Char Gallery Player',
    )

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: asUser(dmCookie),
      body: { name: `Char Gallery Test ${ts}` },
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

    slug = await createCharacter(`Gandalf ${ts}`)
    otherSlug = await createCharacter(`Saruman ${ts}`)
  })

  // ── Listing ───────────────────────────────────────────────────────────────

  it('empty gallery returns [] with 200', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('unauthenticated list returns 401', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images`)
    expect(res.status).toBe(401)
  })

  it('non-existent character returns 404', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/no-such-char/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(404)
  })

  // ── Upload ────────────────────────────────────────────────────────────────

  it('first upload is primary and mirrors into portraitUrl', async () => {
    const image = await upload(slug, 'The wizard')

    expect(image.isPrimary).toBe(true)
    expect(image.sortOrder).toBe(0)
    expect(image.caption).toBe('The wizard')

    const detail = await characterDetail()
    expect(detail.portraitUrl).toBe(image.url)
  })

  it('second upload appends without stealing primary', async () => {
    const before = await listImages()
    const image = await upload()

    expect(image.isPrimary).toBe(false)
    expect(image.sortOrder).toBeGreaterThan(before[before.length - 1]!.sortOrder)

    expect((await characterDetail()).portraitUrl).toBe(before.find((i) => i.isPrimary)!.url)
  })

  it('rejects a disallowed MIME type with 400', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(undefined, 'image/gif', 'portrait.gif'),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a player upload with 403', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images`, {
      method: 'POST',
      headers: asUser(playerCookie),
      body: pngForm(),
    })
    expect(res.status).toBe(403)
  })

  it('rejects an unauthenticated upload with 401', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images`, {
      method: 'POST',
      body: pngForm(),
    })
    expect(res.status).toBe(401)
  })

  // ── Serving ───────────────────────────────────────────────────────────────

  it('serves bytes with a long cache header', async () => {
    const [image] = await listImages()
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images/${image!.id}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/')
    expect(res.headers.get('cache-control')).toContain('max-age=31536000')
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  it('404s an unknown image id', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/characters/${slug}/images/00000000-0000-0000-0000-000000000000`,
      { headers: { 'X-API-Key': dmKey } },
    )
    expect(res.status).toBe(404)
  })

  it('404s an image id belonging to a different character', async () => {
    const foreign = await upload(otherSlug)

    for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
      const res = await api(
        `/api/campaigns/${campaignId}/characters/${slug}/images/${foreign.id}`,
        {
          method,
          headers: { 'X-API-Key': dmKey },
          body: method === 'PATCH' ? { caption: 'hijacked' } : undefined,
        },
      )
      expect(res.status, `${method} should not reach another character's image`).toBe(404)
    }
  })

  // ── Choosing the main image ───────────────────────────────────────────────

  it('promotes another image to primary and moves the portrait mirror', async () => {
    const images = await listImages()
    const target = images.find((i) => !i.isPrimary)!

    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images/${target.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { isPrimary: true },
    })
    expect(res.status).toBe(200)

    const after = await listImages()
    expect(after.filter((i) => i.isPrimary).map((i) => i.id)).toEqual([target.id])
    expect((await characterDetail()).portraitUrl).toBe(target.url)
  })

  it('refuses to unset the primary image', async () => {
    const primary = (await listImages()).find((i) => i.isPrimary)!
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images/${primary.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { isPrimary: false },
    })
    expect(res.status).toBe(400)
  })

  it('edits a caption without disturbing primacy', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images/${image.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { caption: 'Young Gandalf' },
    })
    expect(res.status).toBe(200)
    const updated = await res.json()
    expect(updated.caption).toBe('Young Gandalf')
    expect(updated.isPrimary).toBe(image.isPrimary)
  })

  it('rejects a PATCH from a player with 403', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images/${image.id}`, {
      method: 'PATCH',
      headers: asUser(playerCookie),
      body: { caption: 'nope' },
    })
    expect(res.status).toBe(403)
  })

  // ── Deleting ──────────────────────────────────────────────────────────────

  it('rejects a DELETE from a player with 403', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images/${image.id}`, {
      method: 'DELETE',
      headers: asUser(playerCookie),
    })
    expect(res.status).toBe(403)
  })

  it('deleting the primary promotes the lowest-sortOrder survivor', async () => {
    const before = await listImages()
    const primary = before.find((i) => i.isPrimary)!
    const expectedNext = before
      .filter((i) => i.id !== primary.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0]!

    const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images/${primary.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(204)

    const after = await listImages()
    expect(after.map((i) => i.id)).not.toContain(primary.id)
    expect(after.find((i) => i.isPrimary)!.id).toBe(expectedNext.id)
    expect((await characterDetail()).portraitUrl).toBe(expectedNext.url)
  })

  it('emptying the gallery nulls portraitUrl', async () => {
    for (const image of await listImages()) {
      const res = await api(`/api/campaigns/${campaignId}/characters/${slug}/images/${image.id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': dmKey },
      })
      expect(res.status).toBe(204)
    }

    expect(await listImages()).toEqual([])
    expect((await characterDetail()).portraitUrl).toBeNull()
  })

  // ── portrait.post.ts (task 10.4) ─────────────────────────────────────────

  it('portrait.post.ts creates a gallery row and mirrors portraitUrl', async () => {
    const char = await createCharacter(`Frodo ${ts}`)

    const form = new FormData()
    form.append('portrait', new Blob([PNG_1PX], { type: 'image/png' }), 'frodo.png')

    const res = await api(`/api/campaigns/${campaignId}/characters/${char}/portrait`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: form,
    })
    expect(res.status).toBe(200)
    const { portraitUrl } = await res.json()
    expect(portraitUrl).toContain(`/characters/${char}/images/`)

    const images = await (async () => {
      const r = await api(`/api/campaigns/${campaignId}/characters/${char}/images`, {
        headers: { 'X-API-Key': dmKey },
      })
      return r.json() as Promise<GalleryImage[]>
    })()
    expect(images).toHaveLength(1)
    expect(images[0]!.isPrimary).toBe(true)
    expect(images[0]!.url).toBe(portraitUrl)

    const detail = await api(`/api/campaigns/${campaignId}/characters/${char}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect((await detail.json()).portraitUrl).toBe(portraitUrl)
  })

  it('portrait.post.ts on a character with an existing gallery promotes the new image', async () => {
    const char = await createCharacter(`Bilbo ${ts}`)

    // Seed the gallery
    const imgRes = await api(`/api/campaigns/${campaignId}/characters/${char}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(),
    })
    expect(imgRes.status).toBe(201)

    // Upload via portrait route
    const form = new FormData()
    form.append('portrait', new Blob([PNG_1PX], { type: 'image/png' }), 'bilbo-old.png')
    const res = await api(`/api/campaigns/${campaignId}/characters/${char}/portrait`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: form,
    })
    expect(res.status).toBe(200)
    const { portraitUrl } = await res.json()

    const r = await api(`/api/campaigns/${campaignId}/characters/${char}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    const images: GalleryImage[] = await r.json()
    expect(images).toHaveLength(2)
    expect(images.find((i) => i.isPrimary)!.url).toBe(portraitUrl)
  })
})
