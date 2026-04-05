import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: any }) {
  const isFormData = opts?.body instanceof FormData
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Origin: BASE_URL,
      ...opts?.headers,
    },
    body: isFormData ? opts?.body : opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

describe('Entity Image (integration)', () => {
  const email = `entity-img-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let entitySlug = ''

  // A minimal 1x1 PNG
  const PNG_1PX = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Entity Image Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Entity Image Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
    const ent = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { name: 'Image Test Entity', type: 'location' },
    })
    entitySlug = (await ent.json()).slug
  })

  it('entity detail includes imageUrl: null before upload', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect('imageUrl' in data).toBe(true)
    expect(data.imageUrl).toBeNull()
  })

  it('entity list includes imageUrl field', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities`, { headers: { Cookie: cookie } })
    const data = await res.json()
    const found = data.entities.find((e: any) => e.slug === entitySlug)
    expect(found).toBeDefined()
    expect('imageUrl' in found).toBe(true)
  })

  it('GET image returns 404 when no image uploaded', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/image`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(404)
  })

  it('POST image uploads successfully and returns imageUrl', async () => {
    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/png' }), 'image.png')
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/image`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.imageUrl).toBe(`/api/campaigns/${campaignId}/entities/${entitySlug}/image`)
  })

  it('GET image returns image bytes after upload', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/image`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/')
    expect(res.headers.get('cache-control')).toContain('max-age=3600')
    const buf = await res.arrayBuffer()
    expect(buf.byteLength).toBeGreaterThan(0)
  })

  it('entity detail returns imageUrl after upload', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, { headers: { Cookie: cookie } })
    const data = await res.json()
    expect(data.imageUrl).toBe(`/api/campaigns/${campaignId}/entities/${entitySlug}/image`)
  })

  it('POST image returns 400 for invalid MIME type', async () => {
    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/gif' }), 'image.gif')
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/image`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    expect(res.status).toBe(400)
  })

  it('POST image returns 401 for unauthenticated request', async () => {
    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/png' }), 'image.png')
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/image`, {
      method: 'POST',
      body: form,
    })
    expect(res.status).toBe(401)
  })

  it('POST image returns 404 for non-existent entity', async () => {
    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/png' }), 'image.png')
    const res = await api(`/api/campaigns/${campaignId}/entities/nonexistent-slug/image`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    expect(res.status).toBe(404)
  })
})

describe('Character entity imageUrl falls back to portraitUrl (integration)', () => {
  const email = `char-entity-img-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let charSlug = ''
  let entitySlug = ''

  // A minimal 1x1 PNG
  const PNG_1PX = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Portrait Fallback Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''

    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Portrait Fallback Test ${Date.now()}` } })
    campaignId = (await camp.json()).id

    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'Portrait Hero', characterType: 'pc' },
    })
    const charData = await char.json()
    charSlug = charData.slug
    entitySlug = charData.slug // character slug = entity slug
  })

  it('character entity detail has imageUrl null before portrait upload', async () => {
    const res = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.type).toBe('character')
    expect(data.imageUrl).toBeNull()
  })

  it('after portrait upload, character entity detail imageUrl reflects the portrait', async () => {
    // Upload portrait to character
    const form = new FormData()
    form.append('portrait', new Blob([PNG_1PX], { type: 'image/png' }), 'portrait.png')
    const uploadRes = await api(`/api/campaigns/${campaignId}/characters/${charSlug}/portrait`, {
      method: 'POST', headers: { Cookie: cookie }, body: form,
    })
    expect(uploadRes.status).toBe(200)
    const { portraitUrl } = await uploadRes.json()
    expect(portraitUrl).toContain('/portrait')

    // Entity GET should now return the portrait as imageUrl
    const entityRes = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, { headers: { Cookie: cookie } })
    expect(entityRes.status).toBe(200)
    const entity = await entityRes.json()
    expect(entity.imageUrl).toBe(portraitUrl)
  })

  it('explicit entity imageUrl takes precedence over portrait', async () => {
    // Upload a distinct entity image
    const form = new FormData()
    form.append('image', new Blob([PNG_1PX], { type: 'image/png' }), 'image.png')
    const uploadRes = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}/image`, {
      method: 'POST', headers: { Cookie: cookie }, body: form,
    })
    expect(uploadRes.status).toBe(200)
    const { imageUrl: entityImageUrl } = await uploadRes.json()

    // Entity GET should return the entity image, not the portrait
    const entityRes = await api(`/api/campaigns/${campaignId}/entities/${entitySlug}`, { headers: { Cookie: cookie } })
    const entity = await entityRes.json()
    expect(entity.imageUrl).toBe(entityImageUrl)
    expect(entity.imageUrl).toContain('/entities/')
  })

  it('non-character entity detail does not use portrait fallback', async () => {
    // Create a location entity (no portrait concept)
    const entRes = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { name: 'A Location', type: 'location' },
    })
    const locSlug = (await entRes.json()).slug

    const res = await api(`/api/campaigns/${campaignId}/entities/${locSlug}`, { headers: { Cookie: cookie } })
    const data = await res.json()
    expect(data.type).toBe('location')
    expect(data.imageUrl).toBeNull()
  })
})
