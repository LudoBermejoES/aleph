import { describe, it, expect, beforeAll } from 'vitest'
import { unzipSync } from 'fflate'

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

interface GalleryImage {
  id: string
  url: string
  caption: string | null
  sortOrder: number
  isPrimary: boolean
}

describe('Location gallery export/import round-trip (integration)', () => {
  const ts = Date.now()
  let dmKey = ''
  let dmCookie = ''
  let campaignId = ''
  let slug = ''
  let sourceImages: GalleryImage[] = []

  async function upload(target: string, caption: string) {
    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/png' }), 'shot.png')
    form.append('caption', caption)
    const res = await api(`/api/campaigns/${campaignId}/locations/${target}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: form,
    })
    expect(res.status).toBe(201)
    return (await res.json()) as GalleryImage
  }

  beforeAll(async () => {
    dmCookie = await signUpAndGetCookie(`gallery-export-${ts}@example.com`, 'Gallery Export DM')
    dmKey = await createApiKey(dmCookie, `gallery-export-${ts}`)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: asUser(dmCookie),
      body: { name: `Gallery Export ${ts}` },
    })
    campaignId = (await camp.json()).id

    const loc = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Icewind Dale ${ts}`, subtype: 'region' },
    })
    slug = (await loc.json()).slug

    const first = await upload(slug, 'One')
    const second = await upload(slug, 'Two')
    await upload(slug, 'Three')

    // Make the SECOND image primary, so the round-trip has to carry a non-default choice.
    const patch = await api(`/api/campaigns/${campaignId}/locations/${slug}/images/${second.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { isPrimary: true },
    })
    expect(patch.status).toBe(200)
    expect(first.isPrimary).toBe(true) // it was, before the promotion

    const list = await api(`/api/campaigns/${campaignId}/locations/${slug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    sourceImages = await list.json()
    expect(sourceImages).toHaveLength(3)
  })

  /** Export the campaign and return { payload, zipBuffer, entries }. v1.2 exports are ZIPs. */
  async function exportCampaign(query = '') {
    const res = await api(`/api/campaigns/${campaignId}/export${query}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    const zipBuffer = Buffer.from(await res.arrayBuffer())
    const entries = unzipSync(new Uint8Array(zipBuffer))
    const payload = JSON.parse(Buffer.from(entries['campaign.json']!).toString('utf8'))
    const imageMap = entries['image-map.json']
      ? JSON.parse(Buffer.from(entries['image-map.json']!).toString('utf8'))
      : {}
    return { payload, zipBuffer, entries, imageMap }
  }

  /** Import a previously exported ZIP under a fresh name. */
  async function importZip(zipBuffer: Buffer, name: string) {
    const form = new FormData()
    form.append('file', new Blob([zipBuffer], { type: 'application/zip' }), 'export.zip')
    const res = await api(`/api/campaigns/import?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: asUser(dmCookie),
      body: form,
    })
    expect(res.status).toBe(201)
    return res.json()
  }

  it('export contains a locationImages array with every image', async () => {
    const { payload } = await exportCampaign()

    expect(Array.isArray(payload.locationImages)).toBe(true)
    const mine = payload.locationImages.filter((i: GalleryImage) =>
      sourceImages.some((s) => s.id === i.id),
    )
    expect(mine).toHaveLength(3)
    expect(mine.filter((i: GalleryImage) => i.isPrimary)).toHaveLength(1)
  })

  it('export packs EVERY gallery file, not just the primary', async () => {
    const { entries, imageMap } = await exportCampaign()

    for (const image of sourceImages) {
      const entryName = Object.keys(imageMap).find((k) => imageMap[k] === image.url)
      expect(entryName, `no ZIP entry for ${image.url}`).toBeTruthy()
      expect(entryName).toMatch(/^images\/location-image-/)
      expect(entries[entryName!]!.byteLength).toBeGreaterThan(0)
    }
  })

  it('selective export omits locationImages', async () => {
    const { payload } = await exportCampaign('?include=entities,characters')
    expect('locationImages' in payload).toBe(false)
  })

  it('import restores the gallery, its order, its captions and its main image', async () => {
    const { zipBuffer } = await exportCampaign()
    const newCampaign = await importZip(zipBuffer, `Imported Gallery ${ts}`)

    const list = await api(`/api/campaigns/${newCampaign.id}/locations/${slug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(list.status).toBe(200)
    const restored: GalleryImage[] = await list.json()

    expect(restored).toHaveLength(3)
    expect(restored.map((i) => i.caption)).toEqual(sourceImages.map((i) => i.caption))
    expect(restored.findIndex((i) => i.isPrimary)).toBe(sourceImages.findIndex((i) => i.isPrimary))

    // URLs point at the NEW campaign, and each file is actually readable there.
    for (const image of restored) {
      expect(image.url).toContain(`/api/campaigns/${newCampaign.id}/locations/${slug}/images/`)
      const fileRes = await api(image.url, { headers: { 'X-API-Key': dmKey } })
      expect(fileRes.status, `file missing for ${image.url}`).toBe(200)
      expect((await fileRes.arrayBuffer()).byteLength).toBeGreaterThan(0)
    }

    // The mirror follows the restored primary, not the source campaign's URL.
    const detail = await api(`/api/campaigns/${newCampaign.id}/locations/${slug}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect((await detail.json()).imageUrl).toBe(restored.find((i) => i.isPrimary)!.url)
  })

  it('the same export can be imported twice without an id collision', async () => {
    const { zipBuffer } = await exportCampaign()

    await importZip(zipBuffer, `Twice A ${ts}`)
    const second = await importZip(zipBuffer, `Twice B ${ts}`)

    const list = await api(`/api/campaigns/${second.id}/locations/${slug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(await list.json()).toHaveLength(3)
  })

  it('a JSON export with no locationImages key still imports cleanly', async () => {
    const { payload } = await exportCampaign()
    delete payload.locationImages
    payload.version = '1.1' // the JSON import path

    const res = await api(`/api/campaigns/import?name=No+Gallery+Key+${ts}`, {
      method: 'POST',
      headers: asUser(dmCookie),
      body: payload,
    })
    expect(res.status).toBe(201)

    const newId = (await res.json()).id
    const list = await api(`/api/campaigns/${newId}/locations/${slug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(await list.json()).toEqual([])
  })
})
