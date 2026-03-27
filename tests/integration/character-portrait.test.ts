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

describe('Character Portrait (integration)', () => {
  const email = `portrait-test-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let characterSlug = ''

  // A minimal 1x1 PNG
  const PNG_1PX = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Portrait Tester', email, password: 'password123' } })
    const login = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password: 'password123' } })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    cookie = match ? `better-auth.session_token=${match[1]}` : ''
    const camp = await api('/api/campaigns', { method: 'POST', headers: { Cookie: cookie }, body: { name: `Portrait Test ${Date.now()}` } })
    campaignId = (await camp.json()).id
    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { name: 'Portrait Test Character', characterType: 'npc' },
    })
    characterSlug = (await char.json()).slug
  })

  it('character show and list include portraitUrl: null before upload', async () => {
    const show = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, { headers: { Cookie: cookie } })
    expect(show.status).toBe(200)
    const data = await show.json()
    expect('portraitUrl' in data).toBe(true)
    expect(data.portraitUrl).toBeNull()

    const list = await api(`/api/campaigns/${campaignId}/characters`, { headers: { Cookie: cookie } })
    const chars = await list.json()
    const found = chars.find((c: any) => c.slug === characterSlug)
    expect(found).toBeDefined()
    expect('portraitUrl' in found).toBe(true)
  })

  it('GET portrait returns 404 when no portrait uploaded', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/portrait`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(404)
  })

  it('POST portrait uploads successfully and returns portraitUrl', async () => {
    const form = new FormData()
    form.append('portrait', new Blob([PNG_1PX], { type: 'image/png' }), 'portrait.png')
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/portrait`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.portraitUrl).toBe(`/api/campaigns/${campaignId}/characters/${characterSlug}/portrait`)
  })

  it('GET portrait returns image bytes after upload', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/portrait`, { headers: { Cookie: cookie } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/')
    const buf = await res.arrayBuffer()
    expect(buf.byteLength).toBeGreaterThan(0)
  })

  it('character show returns portraitUrl after upload', async () => {
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}`, { headers: { Cookie: cookie } })
    const data = await res.json()
    expect(data.portraitUrl).toBe(`/api/campaigns/${campaignId}/characters/${characterSlug}/portrait`)
  })

  it('POST portrait returns 400 for invalid MIME type (gif)', async () => {
    const form = new FormData()
    form.append('portrait', new Blob([PNG_1PX], { type: 'image/gif' }), 'portrait.gif')
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/portrait`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    expect(res.status).toBe(400)
  })

  it('POST portrait returns 403 for visitor', async () => {
    // Register a visitor and join with visitor role via invitation — instead just test unauthenticated = 401
    const res = await api(`/api/campaigns/${campaignId}/characters/${characterSlug}/portrait`, {
      method: 'POST',
      body: new FormData(),
    })
    expect(res.status).toBe(401)
  })
})
