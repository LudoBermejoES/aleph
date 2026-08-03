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

describe('Character + org gallery export/import round-trip (integration)', () => {
  const ts = Date.now()
  let dmKey = ''
  let dmCookie = ''
  let campaignId = ''
  let charSlug = ''
  let orgSlug = ''
  let sourceCharImages: GalleryImage[] = []
  let sourceOrgImages: GalleryImage[] = []

  async function uploadChar(caption: string) {
    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/png' }), 'portrait.png')
    form.append('caption', caption)
    const res = await api(`/api/campaigns/${campaignId}/characters/${charSlug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: form,
    })
    expect(res.status).toBe(201)
    return (await res.json()) as GalleryImage
  }

  async function uploadOrg(caption: string) {
    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/png' }), 'banner.png')
    form.append('caption', caption)
    const res = await api(`/api/campaigns/${campaignId}/organizations/${orgSlug}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: form,
    })
    expect(res.status).toBe(201)
    return (await res.json()) as GalleryImage
  }

  beforeAll(async () => {
    dmCookie = await signUpAndGetCookie(`gallery-ei-dm-${ts}@example.com`, 'Gallery EI DM')
    dmKey = await createApiKey(dmCookie, `gallery-ei-${ts}`)

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: asUser(dmCookie),
      body: { name: `Gallery EI Test ${ts}` },
    })
    campaignId = (await camp.json()).id

    const charRes = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Aragorn ${ts}`, characterType: 'pc' },
    })
    charSlug = (await charRes.json()).slug

    const orgRes = await api(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { 'X-API-Key': dmKey },
      body: { name: `Rangers ${ts}`, type: 'faction' },
    })
    orgSlug = (await orgRes.json()).slug

    // Upload two character images; promote the second
    await uploadChar('Young Aragorn')
    const c2 = await uploadChar('Ranger Aragorn')
    await api(`/api/campaigns/${campaignId}/characters/${charSlug}/images/${c2.id}`, {
      method: 'PATCH',
      headers: { 'X-API-Key': dmKey },
      body: { isPrimary: true },
    })

    // Upload two org images; first stays primary
    await uploadOrg('Rangers crest')
    await uploadOrg('Rangers banner')

    const cr = await api(`/api/campaigns/${campaignId}/characters/${charSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    sourceCharImages = await cr.json()

    const or = await api(`/api/campaigns/${campaignId}/organizations/${orgSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    sourceOrgImages = await or.json()

    expect(sourceCharImages).toHaveLength(2)
    expect(sourceOrgImages).toHaveLength(2)
  })

  async function exportCampaign() {
    const res = await api(`/api/campaigns/${campaignId}/export`, {
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

  // ── Export ────────────────────────────────────────────────────────────────

  it('export contains characterImages and organizationImages arrays', async () => {
    const { payload } = await exportCampaign()

    expect(Array.isArray(payload.characterImages)).toBe(true)
    expect(Array.isArray(payload.organizationImages)).toBe(true)

    const myCharImages = payload.characterImages.filter((i: GalleryImage) =>
      sourceCharImages.some((s) => s.id === i.id),
    )
    const myOrgImages = payload.organizationImages.filter((i: GalleryImage) =>
      sourceOrgImages.some((s) => s.id === i.id),
    )

    expect(myCharImages).toHaveLength(2)
    expect(myOrgImages).toHaveLength(2)
    expect(myCharImages.filter((i: GalleryImage) => i.isPrimary)).toHaveLength(1)
    expect(myOrgImages.filter((i: GalleryImage) => i.isPrimary)).toHaveLength(1)
  })

  it('export packs all character and org gallery files in the ZIP', async () => {
    const { entries, imageMap } = await exportCampaign()

    for (const image of [...sourceCharImages, ...sourceOrgImages]) {
      const entryName = Object.keys(imageMap).find((k) => imageMap[k] === image.url)
      expect(entryName, `no ZIP entry for ${image.url}`).toBeTruthy()
      expect(entries[entryName!]!.byteLength).toBeGreaterThan(0)
    }
  })

  it('locationImages and characterImages/orgImages are partitioned (no bleed-over)', async () => {
    const { payload } = await exportCampaign()
    const charIds = new Set(sourceCharImages.map((i) => i.id))
    const orgIds = new Set(sourceOrgImages.map((i) => i.id))

    if (payload.locationImages) {
      for (const img of payload.locationImages) {
        expect(charIds.has(img.id)).toBe(false)
        expect(orgIds.has(img.id)).toBe(false)
      }
    }
    for (const img of payload.characterImages ?? []) {
      expect(orgIds.has(img.id)).toBe(false)
    }
    for (const img of payload.organizationImages ?? []) {
      expect(charIds.has(img.id)).toBe(false)
    }
  })

  // ── Import ────────────────────────────────────────────────────────────────

  it('import restores character gallery with correct order, captions, and primary', async () => {
    const { zipBuffer } = await exportCampaign()
    const newCampaign = await importZip(zipBuffer, `Char Gallery Import ${ts}`)

    const res = await api(`/api/campaigns/${newCampaign.id}/characters/${charSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    const restored: GalleryImage[] = await res.json()

    expect(restored).toHaveLength(2)
    expect(restored.map((i) => i.caption)).toEqual(sourceCharImages.map((i) => i.caption))
    expect(restored.findIndex((i) => i.isPrimary)).toBe(
      sourceCharImages.findIndex((i) => i.isPrimary),
    )

    // Each file is readable in the new campaign
    for (const image of restored) {
      expect(image.url).toContain(`/api/campaigns/${newCampaign.id}/characters/${charSlug}/images/`)
      const fileRes = await api(image.url, { headers: { 'X-API-Key': dmKey } })
      expect(fileRes.status, `file missing for ${image.url}`).toBe(200)
    }

    // Mirror column follows the restored primary
    const detail = await api(`/api/campaigns/${newCampaign.id}/characters/${charSlug}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect((await detail.json()).portraitUrl).toBe(restored.find((i) => i.isPrimary)!.url)
  })

  it('import restores org gallery with correct order, captions, and primary', async () => {
    const { zipBuffer } = await exportCampaign()
    const newCampaign = await importZip(zipBuffer, `Org Gallery Import ${ts}`)

    const res = await api(`/api/campaigns/${newCampaign.id}/organizations/${orgSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(res.status).toBe(200)
    const restored: GalleryImage[] = await res.json()

    expect(restored).toHaveLength(2)
    expect(restored.map((i) => i.caption)).toEqual(sourceOrgImages.map((i) => i.caption))
    expect(restored.findIndex((i) => i.isPrimary)).toBe(
      sourceOrgImages.findIndex((i) => i.isPrimary),
    )

    for (const image of restored) {
      expect(image.url).toContain(
        `/api/campaigns/${newCampaign.id}/organizations/${orgSlug}/images/`,
      )
      const fileRes = await api(image.url, { headers: { 'X-API-Key': dmKey } })
      expect(fileRes.status, `file missing for ${image.url}`).toBe(200)
    }

    const detail = await api(`/api/campaigns/${newCampaign.id}/organizations/${orgSlug}`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect((await detail.json()).imageUrl).toBe(restored.find((i) => i.isPrimary)!.url)
  })

  it('importing twice does not cause id collisions', async () => {
    const { zipBuffer } = await exportCampaign()

    await importZip(zipBuffer, `Double Import A ${ts}`)
    const second = await importZip(zipBuffer, `Double Import B ${ts}`)

    const charList = await api(`/api/campaigns/${second.id}/characters/${charSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    const orgList = await api(`/api/campaigns/${second.id}/organizations/${orgSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(await charList.json()).toHaveLength(2)
    expect(await orgList.json()).toHaveLength(2)
  })

  it('an export with no characterImages/organizationImages keys imports cleanly', async () => {
    const { payload } = await exportCampaign()
    delete payload.characterImages
    delete payload.organizationImages
    payload.version = '1.1' // triggers the JSON (non-ZIP) import path

    const res = await api(`/api/campaigns/import?name=No+Char+Org+Gallery+${ts}`, {
      method: 'POST',
      headers: asUser(dmCookie),
      body: payload,
    })
    expect(res.status).toBe(201)

    const newId = (await res.json()).id
    const charList = await api(`/api/campaigns/${newId}/characters/${charSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    const orgList = await api(`/api/campaigns/${newId}/organizations/${orgSlug}/images`, {
      headers: { 'X-API-Key': dmKey },
    })
    expect(await charList.json()).toEqual([])
    expect(await orgList.json()).toEqual([])
  })
})
