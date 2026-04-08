import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetApiKey(email: string) {
  await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name: 'Test', email, password: 'password123' },
  })
  const loginRes = await api('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password: 'password123' },
  })
  const cookies = loginRes.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  // Get CSRF token
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const fullCookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
  const keyRes = await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: fullCookie, 'X-CSRF-Token': csrfToken },
    body: { name: 'key' },
  })
  return (await keyRes.json()).key as string
}

function buildFormData(
  fieldName: string,
  data: Buffer,
  filename: string,
  mimeType: string,
): FormData {
  const formData = new FormData()
  const blob = new Blob([data], { type: mimeType })
  formData.append(fieldName, blob, filename)
  return formData
}

// Minimal valid PNG (1x1 pixel)
const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
])

// Fake "PNG" that is actually text
const FAKE_PNG = Buffer.from('This is not a real PNG file')

describe('File Upload Validation (integration)', () => {
  const ts = Date.now()
  let apiKey = ''
  let campaignId = ''
  let entitySlug = ''

  beforeAll(async () => {
    apiKey = await signUpAndGetApiKey(`upload-val-${ts}@example.com`)
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Upload Val Test ${ts}` },
    })
    campaignId = (await camp.json()).id

    const entity = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Upload Entity ${ts}`, type: 'character' },
    })
    entitySlug = (await entity.json()).slug
  })

  it('rejects upload with mismatched MIME (claims PNG but content is text)', async () => {
    const formData = buildFormData('image', FAKE_PNG, 'fake.png', 'image/png')
    const res = await fetch(
      `${BASE_URL}/api/campaigns/${campaignId}/entities/${entitySlug}/image`,
      {
        method: 'POST',
        headers: { 'X-API-Key': apiKey },
        body: formData,
      },
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toContain('MIME')
  })

  it('accepts valid PNG upload', async () => {
    const formData = buildFormData('image', VALID_PNG, 'valid.png', 'image/png')
    const res = await fetch(
      `${BASE_URL}/api/campaigns/${campaignId}/entities/${entitySlug}/image`,
      {
        method: 'POST',
        headers: { 'X-API-Key': apiKey },
        body: formData,
      },
    )
    expect([200, 201]).toContain(res.status)
  })
})
