/**
 * Integration coverage for the GENERIC entity gallery — `entities/:slug/images` — and for the
 * `images` field `diagrams/entities/batch` now returns.
 *
 * Two rules this file keeps deliberately (they are the repo's two recorded failure shapes):
 *
 *  1. **Assert rows, never that a key exists.** The suite for `diagrams/entities/batch` already
 *     shipped a test that `expect(data).toHaveProperty('wiki')` satisfied with a permanently empty
 *     array. So every assertion here names the ids/urls it expects, and the ordering test reorders
 *     the gallery and requires the response order to follow.
 *  2. **A control query before any absence claim.** Every "the server refuses" test is paired with
 *     the same request by a caller who must succeed, so a blanket 404 cannot pass as a visibility
 *     rule.
 */
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

function pngForm(caption?: string, type = 'image/png', name = 'photo.png', field = 'image') {
  const form = new FormData()
  form.append(field, new Blob([PNG_1PX], { type }), name)
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

interface BatchEntity {
  id: string
  name: string
  type: string
  slug: string
  portraitUrl: string | null
  tags: string[]
  status: string | null
  images: { id: string; url: string }[]
}

describe('Generic entity image gallery (integration)', () => {
  const ts = Date.now()
  let dmKey = ''
  let dmCookie = ''
  let playerCookie = ''
  let playerKey = ''
  let campaignId = ''
  let slug = ''
  let otherSlug = ''
  let dmOnlySlug = ''

  async function createEntity(name: string, type = 'item', visibility?: string) {
    const res = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name, type, ...(visibility ? { visibility } : {}) },
    })
    expect(res.status).toBe(200)
    return (await res.json()) as { id: string; slug: string }
  }

  async function listImages(target = slug): Promise<GalleryImage[]> {
    const res = await api(`/api/campaigns/${campaignId}/entities/${target}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    return res.json()
  }

  async function upload(target = slug, caption?: string) {
    const res = await api(`/api/campaigns/${campaignId}/entities/${target}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(caption),
    })
    expect(res.status).toBe(201)
    return (await res.json()) as GalleryImage
  }

  async function entityDetail(target = slug) {
    const res = await api(`/api/campaigns/${campaignId}/entities/${target}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    return res.json() as Promise<{ id: string; slug: string; imageUrl: string | null }>
  }

  beforeAll(async () => {
    dmCookie = await signUpAndGetCookie(`ent-img-dm-${ts}@example.com`, 'Entity Gallery DM')
    dmKey = await createApiKey(dmCookie, `ent-gallery-dm-${ts}`)
    playerCookie = await signUpAndGetCookie(
      `ent-img-player-${ts}@example.com`,
      'Entity Gallery Player',
    )
    playerKey = await createApiKey(playerCookie, `ent-gallery-player-${ts}`)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: asUser(dmCookie),
      body: { name: `Entity Gallery Test ${ts}` },
    })
    campaignId = (await camp.json()).id

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { role: 'player' },
    })
    const { token } = await invite.json()
    const joined = await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: asUser(playerCookie),
      body: { token },
    })
    expect(joined.status).toBe(200)

    slug = (await createEntity(`Golden Suit ${ts}`)).slug
    otherSlug = (await createEntity(`Silver Suit ${ts}`)).slug
    dmOnlySlug = (await createEntity(`Hidden Relic ${ts}`, 'item', 'dm_only')).slug
  })

  // ── Listing ───────────────────────────────────────────────────────────────

  it('empty gallery returns [] with 200', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('unauthenticated list returns 401', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images`)
    expect(res.status).toBe(401)
  })

  it('non-existent entity returns 404', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/no-such-entity/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(404)
  })

  // ── Upload ────────────────────────────────────────────────────────────────

  it('first upload is primary and mirrors into entities.image_url', async () => {
    const image = await upload(slug, 'The suit')

    expect(image.isPrimary).toBe(true)
    expect(image.sortOrder).toBe(0)
    expect(image.caption).toBe('The suit')
    expect(image.url).toBe(`/api/campaigns/${campaignId}/entities/${slug}/images/${image.id}`)

    expect((await entityDetail()).imageUrl).toBe(image.url)
  })

  it('second upload appends without stealing primary', async () => {
    const before = await listImages()
    const image = await upload()

    expect(image.isPrimary).toBe(false)
    expect(image.sortOrder).toBeGreaterThan(before[before.length - 1]!.sortOrder)

    const after = await listImages()
    expect(after.map((i) => i.id)).toEqual([...before.map((i) => i.id), image.id])
    expect((await entityDetail()).imageUrl).toBe(before.find((i) => i.isPrimary)!.url)
  })

  it('rejects a disallowed MIME type with 400', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(undefined, 'image/gif', 'photo.gif'),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a request with no file part with 400', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(undefined, 'image/png', 'photo.png', 'not-image'),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a player upload with 403', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images`, {
      method: 'POST',
      headers: asUser(playerCookie),
      body: pngForm(),
    })
    expect(res.status).toBe(403)
  })

  it('rejects an unauthenticated upload with 401', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images`, {
      method: 'POST',
      body: pngForm(),
    })
    expect(res.status).toBe(401)
  })

  // ── Serving ───────────────────────────────────────────────────────────────

  it('serves bytes with a long cache header', async () => {
    const [image] = await listImages()
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${image!.id}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/')
    expect(res.headers.get('cache-control')).toContain('max-age=31536000')
    expect((await res.arrayBuffer()).byteLength).toBe(PNG_1PX.byteLength)
  })

  it('a player can read the bytes of a visible entity image', async () => {
    const [image] = await listImages()
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${image!.id}`, {
      headers: { 'X-API-Key': playerKey },
    })
    expect(res.status).toBe(200)
  })

  it('404s an unknown image id', async () => {
    const res = await api(
      `/api/campaigns/${campaignId}/entities/${slug}/images/00000000-0000-0000-0000-000000000000`,
      { headers: { 'X-API-Key': dmKey } },
    )
    expect(res.status).toBe(404)
  })

  it('404s an image id belonging to a different entity', async () => {
    const foreign = await upload(otherSlug)

    for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
      const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${foreign.id}`, {
        method,
        headers: { 'X-API-Key': dmKey },
        body: method === 'PATCH' ? { caption: 'hijacked' } : undefined,
      })
      expect(res.status, `${method} should not reach another entity's image`).toBe(404)
    }

    // Control: the same id IS reachable on its own entity, so the 404s above are about ownership.
    const own = await api(
      `/api/campaigns/${campaignId}/entities/${otherSlug}/images/${foreign.id}`,
      { headers: { 'X-API-Key': dmKey } },
    )
    expect(own.status).toBe(200)
  })

  // ── Choosing the main image ───────────────────────────────────────────────

  it('promotes another image to primary and moves entities.image_url in one step', async () => {
    const images = await listImages()
    const target = images.find((i) => !i.isPrimary)!

    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${target.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { isPrimary: true },
    })
    expect(res.status).toBe(200)

    const after = await listImages()
    // Exactly one primary, and it is the target — the transaction cleared every other.
    expect(after.filter((i) => i.isPrimary).map((i) => i.id)).toEqual([target.id])
    expect((await entityDetail()).imageUrl).toBe(target.url)
  })

  it('refuses to unset the primary image with 400', async () => {
    const primary = (await listImages()).find((i) => i.isPrimary)!
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${primary.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { isPrimary: false },
    })
    expect(res.status).toBe(400)

    // …and it really is still primary afterwards.
    const after = await listImages()
    expect(after.find((i) => i.isPrimary)!.id).toBe(primary.id)
  })

  it('edits a caption without disturbing primacy', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${image.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { caption: 'Front view' },
    })
    expect(res.status).toBe(200)
    const updated = await res.json()
    expect(updated.caption).toBe('Front view')
    expect(updated.isPrimary).toBe(image.isPrimary)
  })

  it('rejects an unknown field with 422', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${image.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { nope: true },
    })
    expect(res.status).toBe(422)
  })

  it('rejects a PATCH from a player with 403', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${image.id}`, {
      method: 'PATCH',
      headers: asUser(playerCookie),
      body: { caption: 'nope' },
    })
    expect(res.status).toBe(403)
  })

  // ── dm_only ───────────────────────────────────────────────────────────────

  it('a player cannot list the images of a dm_only entity, but the DM can', async () => {
    await upload(dmOnlySlug, 'secret')

    const dmRes = await api(`/api/campaigns/${campaignId}/entities/${dmOnlySlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(dmRes.status).toBe(200)
    const dmRows = (await dmRes.json()) as GalleryImage[]
    expect(dmRows).toHaveLength(1)
    expect(dmRows[0]!.caption).toBe('secret')

    const playerRes = await api(`/api/campaigns/${campaignId}/entities/${dmOnlySlug}/images`, {
      headers: { 'X-API-Key': playerKey },
    })
    expect(playerRes.status).toBe(404)

    // Control: the same player CAN list a visible entity's gallery, so the refusal above is the
    // visibility rule and not a blanket denial.
    const visible = await api(`/api/campaigns/${campaignId}/entities/${slug}/images`, {
      headers: { 'X-API-Key': playerKey },
    })
    expect(visible.status).toBe(200)
    expect(((await visible.json()) as GalleryImage[]).length).toBeGreaterThan(0)
  })

  it('a player cannot read the bytes of a dm_only entity image', async () => {
    const rows = (await listImages(dmOnlySlug)) as GalleryImage[]
    const res = await api(
      `/api/campaigns/${campaignId}/entities/${dmOnlySlug}/images/${rows[0]!.id}`,
      { headers: { 'X-API-Key': playerKey } },
    )
    expect(res.status).toBe(404)
  })

  // ── Deleting ──────────────────────────────────────────────────────────────

  it('rejects a DELETE from a player with 403', async () => {
    const image = (await listImages())[0]!
    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${image.id}`, {
      method: 'DELETE',
      headers: asUser(playerCookie),
    })
    expect(res.status).toBe(403)
    expect((await listImages()).map((i) => i.id)).toContain(image.id)
  })

  it('deleting the primary promotes the lowest-sortOrder survivor', async () => {
    const before = await listImages()
    const primary = before.find((i) => i.isPrimary)!
    const expectedNext = before
      .filter((i) => i.id !== primary.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0]!

    const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${primary.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(204)

    const after = await listImages()
    expect(after.map((i) => i.id)).not.toContain(primary.id)
    expect(after.find((i) => i.isPrimary)!.id).toBe(expectedNext.id)
    expect((await entityDetail()).imageUrl).toBe(expectedNext.url)
  })

  it('emptying the gallery nulls entities.image_url', async () => {
    for (const image of await listImages()) {
      const res = await api(`/api/campaigns/${campaignId}/entities/${slug}/images/${image.id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': dmKey },
      })
      expect(res.status).toBe(204)
    }

    expect(await listImages()).toEqual([])
    expect((await entityDetail()).imageUrl).toBeNull()
  })

  // ── The pre-gallery image (design D6 / task 1.6) ──────────────────────────

  it('an entity whose image predates the gallery keeps it: the first upload adopts it', async () => {
    const legacy = await createEntity(`Legacy Relic ${ts}`)

    // `entity upload-image` — the pre-gallery path, still the only one the CLI had.
    const up = await api(`/api/campaigns/${campaignId}/entities/${legacy.slug}/image`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(),
    })
    expect(up.status).toBe(200)
    const legacyUrl = (await up.json()).imageUrl as string
    expect(legacyUrl).toBe(`/api/campaigns/${campaignId}/entities/${legacy.slug}/image`)

    // Before the gallery is used, the column is the only record — no rows, and nothing lost.
    expect(await listImages(legacy.slug)).toEqual([])
    expect((await entityDetail(legacy.slug)).imageUrl).toBe(legacyUrl)

    // The first gallery upload folds the old image in as the primary instead of displacing it.
    const added = await upload(legacy.slug, 'new photograph')
    const rows = await listImages(legacy.slug)
    expect(rows).toHaveLength(2)

    const adopted = rows.find((i) => i.id !== added.id)!
    expect(adopted.sortOrder).toBe(0)
    expect(adopted.isPrimary).toBe(true)
    expect(adopted.caption).toBeNull()
    expect(added.isPrimary).toBe(false)

    // The adopted row serves real bytes, and the entity still shows the older image.
    const bytes = await api(
      `/api/campaigns/${campaignId}/entities/${legacy.slug}/images/${adopted.id}`,
      { headers: { 'X-API-Key': dmKey } },
    )
    expect(bytes.status).toBe(200)
    expect((await bytes.arrayBuffer()).byteLength).toBe(PNG_1PX.byteLength)
    expect((await entityDetail(legacy.slug)).imageUrl).toBe(adopted.url)
  })

  it('adoption happens once: a third upload does not re-adopt', async () => {
    const legacy = await createEntity(`Legacy Relic Twice ${ts}`)
    await api(`/api/campaigns/${campaignId}/entities/${legacy.slug}/image`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(),
    })

    await upload(legacy.slug)
    expect(await listImages(legacy.slug)).toHaveLength(2)
    await upload(legacy.slug)
    expect(await listImages(legacy.slug)).toHaveLength(3)
  })

  it('an entity with no image at all is unaffected: first upload creates exactly one row', async () => {
    const fresh = await createEntity(`Fresh Relic ${ts}`)
    const image = await upload(fresh.slug)
    const rows = await listImages(fresh.slug)
    expect(rows.map((i) => i.id)).toEqual([image.id])
    expect(rows[0]!.isPrimary).toBe(true)
  })

  // ── The dedicated galleries keep their own mirror column ──────────────────

  it('a character reached through the generic route still mirrors into portraitUrl', async () => {
    const charRes = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Generic Route Char ${ts}`, characterType: 'npc' },
    })
    expect(charRes.status).toBe(200)
    const charSlug = (await charRes.json()).slug as string

    const image = await upload(charSlug)
    // The row was created with the CHARACTER url, not an `entities/...` one, so the dedicated
    // gallery and this one cannot disagree about where the bytes are.
    expect(image.url).toBe(`/api/campaigns/${campaignId}/characters/${charSlug}/images/${image.id}`)

    const detail = await api(`/api/campaigns/${campaignId}/characters/${charSlug}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect((await detail.json()).portraitUrl).toBe(image.url)

    // And the dedicated route lists the very same row.
    const viaCharacter = await api(`/api/campaigns/${campaignId}/characters/${charSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(((await viaCharacter.json()) as GalleryImage[]).map((i) => i.id)).toEqual([image.id])

    // Bytes are reachable through BOTH routes.
    for (const url of [
      `/api/campaigns/${campaignId}/entities/${charSlug}/images/${image.id}`,
      `/api/campaigns/${campaignId}/characters/${charSlug}/images/${image.id}`,
    ]) {
      const res = await api(url, { headers: { 'X-API-Key': dmKey } })
      expect(res.status, url).toBe(200)
    }
  })
})

describe('diagrams/entities/batch returns each entity gallery (integration)', () => {
  const ts = Date.now()
  let dmKey = ''
  let dmCookie = ''
  let playerCookie = ''
  let playerKey = ''
  let campaignId = ''
  let plainId = ''
  let plainSlug = ''
  let emptyId = ''
  let hiddenId = ''
  let hiddenSlug = ''
  let orgId = ''
  let orgSlug = ''

  async function batch(ids: string[], key: string) {
    const res = await api(
      `/api/campaigns/${campaignId}/diagrams/entities/batch?ids=${ids.join(',')}`,
      { headers: { 'X-API-Key': key } },
    )
    expect(res.status).toBe(200)
    return (await res.json()) as Record<string, BatchEntity>
  }

  async function upload(target: string, caption: string) {
    const res = await api(`/api/campaigns/${campaignId}/entities/${target}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(caption),
    })
    expect(res.status).toBe(201)
    return (await res.json()) as GalleryImage
  }

  beforeAll(async () => {
    dmCookie = await signUpAndGetCookie(`batch-img-dm-${ts}@example.com`, 'Batch Gallery DM')
    dmKey = await createApiKey(dmCookie, `batch-gallery-dm-${ts}`)
    playerCookie = await signUpAndGetCookie(
      `batch-img-player-${ts}@example.com`,
      'Batch Gallery Player',
    )
    playerKey = await createApiKey(playerCookie, `batch-gallery-player-${ts}`)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: asUser(dmCookie),
      body: { name: `Batch Gallery Test ${ts}` },
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

    const mk = async (name: string, visibility?: string) => {
      const res = await api(`/api/campaigns/${campaignId}/entities`, {
        method: 'POST',
        headers: { 'X-API-Key': dmKey },
        body: { name, type: 'item', ...(visibility ? { visibility } : {}) },
      })
      expect(res.status).toBe(200)
      return (await res.json()) as { id: string; slug: string }
    }

    const org = await api(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Batch Faction ${ts}`, type: 'faction' },
    })
    expect(org.status).toBe(200)
    const orgBody = (await org.json()) as { id: string; slug: string }
    // `createOrganization()` uses one id for the organization AND its entity, so this IS the
    // entity id `batch` is keyed on.
    orgId = orgBody.id
    orgSlug = orgBody.slug

    const plain = await mk(`Batch Suit ${ts}`)
    plainId = plain.id
    plainSlug = plain.slug
    emptyId = (await mk(`Batch Empty ${ts}`)).id
    const hidden = await mk(`Batch Hidden ${ts}`, 'dm_only')
    hiddenId = hidden.id
    hiddenSlug = hidden.slug
  })

  it('returns the gallery, in sortOrder, as {id, url} rows', async () => {
    const a = await upload(plainSlug, 'a')
    const b = await upload(plainSlug, 'b')

    const data = await batch([plainId], dmKey)
    expect(data[plainId]!.images).toEqual([
      { id: a.id, url: a.url },
      { id: b.id, url: b.url },
    ])
  })

  it('follows sortOrder rather than insertion order', async () => {
    const before = await batch([plainId], dmKey)
    const [first, second] = before[plainId]!.images
    expect(first).toBeDefined()
    expect(second).toBeDefined()

    // Push the first image behind the second and require the response order to follow.
    const res = await api(
      `/api/campaigns/${campaignId}/entities/${plainSlug}/images/${first!.id}`,
      { method: 'PATCH', headers: { 'X-API-Key': dmKey }, body: { sortOrder: 99 } },
    )
    expect(res.status).toBe(200)

    const after = await batch([plainId], dmKey)
    expect(after[plainId]!.images.map((i) => i.id)).toEqual([second!.id, first!.id])
  })

  it('returns [] for an entity with no images, not a missing field', async () => {
    const data = await batch([emptyId], dmKey)
    expect(data[emptyId]).toBeDefined()
    expect(data[emptyId]!.images).toEqual([])
  })

  it('keeps the existing fields alongside images', async () => {
    const data = await batch([plainId], dmKey)
    const entity = data[plainId]!
    expect(entity.name).toBe(`Batch Suit ${ts}`)
    expect(entity.slug).toBe(plainSlug)
    expect(entity.type).toBe('item')
    expect(entity.tags).toEqual([])

    // `portraitUrl` still carries the primary (the fallback hydration uses when there is no
    // override), and the primary is one of the rows `images` lists.
    const listed = await api(`/api/campaigns/${campaignId}/entities/${plainSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    const primary = ((await listed.json()) as GalleryImage[]).find((i) => i.isPrimary)!
    expect(entity.portraitUrl).toBe(primary.url)
    expect(entity.images.map((i) => i.id)).toContain(primary.id)
  })

  // ── The organization crest (the 109-of-109 regression) ───────────────────
  //
  // The fixture is built in the state the real data is in: the crest lives ONLY in
  // `organizations.image_url`, written by the organization gallery's own transaction, and
  // `entities.image_url` is NULL. A fixture where both columns carried the same URL could not fail
  // in either version of the code — it would be the tenth test in this repo that asserts the bug.

  it('resolves an organization crest from organizations.image_url, with entities.image_url NULL', async () => {
    // Upload through the ORGANIZATION gallery, which mirrors into `organizations.image_url` only.
    const up = await api(`/api/campaigns/${campaignId}/organizations/${orgSlug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm('el escudo'),
    })
    expect(up.status).toBe(201)
    const crest = (await up.json()) as GalleryImage
    expect(crest.url).toContain(`/organizations/${orgSlug}/images/`)

    // Prove the fixture really is the real state: the organization carries the crest…
    const orgDetail = await api(`/api/campaigns/${campaignId}/organizations/${orgSlug}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect((await orgDetail.json()).imageUrl).toBe(crest.url)
    // …and the ENTITY column is empty, so a reader that only knows `entities.image_url` is blind.
    const entDetail = await api(`/api/campaigns/${campaignId}/entities/${orgSlug}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect((await entDetail.json()).imageUrl).toBeNull()

    const data = await batch([orgId], dmKey)
    expect(data[orgId]).toBeDefined()
    expect(data[orgId]!.type).toBe('organization')
    // The row, not the key: the crest URL itself.
    expect(data[orgId]!.portraitUrl).toBe(crest.url)
    expect(data[orgId]!.images).toEqual([{ id: crest.id, url: crest.url }])
  })

  it('an organization with no crest at all still answers null rather than throwing', async () => {
    const bare = await api(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Batch Bare Faction ${ts}`, type: 'faction' },
    })
    const bareId = (await bare.json()).id as string

    const data = await batch([bareId], dmKey)
    expect(data[bareId]).toBeDefined()
    expect(data[bareId]!.portraitUrl).toBeNull()
    expect(data[bareId]!.images).toEqual([])
  })

  it('promoting a second crest moves what batch reports', async () => {
    const second = await api(`/api/campaigns/${campaignId}/organizations/${orgSlug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm('el escudo nuevo'),
    })
    expect(second.status).toBe(201)
    const newCrest = (await second.json()) as GalleryImage
    expect(newCrest.isPrimary).toBe(false)

    // Still the OLD crest until it is promoted.
    expect((await batch([orgId], dmKey))[orgId]!.portraitUrl).not.toBe(newCrest.url)

    const promote = await api(
      `/api/campaigns/${campaignId}/organizations/${orgSlug}/images/${newCrest.id}`,
      { method: 'PATCH', headers: { 'X-API-Key': dmKey }, body: { isPrimary: true } },
    )
    expect(promote.status).toBe(200)

    expect((await batch([orgId], dmKey))[orgId]!.portraitUrl).toBe(newCrest.url)
  })

  it('a character entity still resolves from characters.portrait_url, unchanged', async () => {
    // The specialised-first rule must not have regressed the branch that already worked.
    const charRes = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Batch Char ${ts}`, characterType: 'npc' },
    })
    // `POST /characters` returns BOTH `id` (the character row) and `entityId` — `batch` is keyed
    // on the ENTITY id, and reading the wrong one answers `undefined`, not an error.
    const char = (await charRes.json()) as { id: string; entityId: string; slug: string }
    expect(char.entityId).toBeTruthy()

    const up = await api(`/api/campaigns/${campaignId}/characters/${char.slug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: pngForm(),
    })
    const portrait = (await up.json()) as GalleryImage

    const data = await batch([char.entityId], dmKey)
    expect(data[char.entityId]).toBeDefined()
    expect(data[char.entityId]!.portraitUrl).toBe(portrait.url)
  })

  it('a questNode entity carries no image, so it cannot be blanked by this rule', async () => {
    // Measured, not assumed: `SHAPE_IMAGE_PROP_KEY` has no `questNode` entry, so hydration writes
    // no image prop for a quest. This asserts the server half — a quest entity has no specialised
    // image column anywhere in the schema, so `entities.image_url` is the whole answer.
    const quest = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Batch Quest ${ts}`, type: 'quest' },
    })
    const questId = (await quest.json()).id as string

    const data = await batch([questId], dmKey)
    expect(data[questId]!.type).toBe('quest')
    expect(data[questId]!.portraitUrl).toBeNull()
    expect(data[questId]!.images).toEqual([])
  })

  it('a player gets the images of a visible entity and no row at all for a dm_only one', async () => {
    await upload(hiddenSlug, 'secret')

    // Control first: the DM sees the hidden entity's gallery, so the absence below is the filter.
    const asDm = await batch([plainId, hiddenId], dmKey)
    expect(asDm[hiddenId]!.images).toHaveLength(1)

    const asPlayer = await batch([plainId, hiddenId], playerKey)
    expect(asPlayer[hiddenId]).toBeUndefined()
    expect(asPlayer[plainId]!.images.map((i) => i.id)).toEqual(
      asDm[plainId]!.images.map((i) => i.id),
    )
  })
})
