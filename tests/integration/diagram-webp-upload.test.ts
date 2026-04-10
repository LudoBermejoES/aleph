/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const uid = () => Date.now().toString(36).slice(-6)

async function signUpAndGetCookie(email: string, password: string, name = 'Test User') {
  await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    body: JSON.stringify({ name, email, password }),
  })
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    body: JSON.stringify({ email, password }),
  })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await fetch(`${BASE_URL}/api/campaigns`, {
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, Cookie: sessionCookie },
  })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string) {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await fetch(`${BASE_URL}/api/apikeys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE_URL,
      Cookie: cookie,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ name: 'test-key' }),
  })
  return res.json()
}

async function createCampaign(apiKey: string, name: string) {
  const res = await fetch(`${BASE_URL}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, 'X-API-Key': apiKey },
    body: JSON.stringify({ name, theme: 'default' }),
  })
  return res.json()
}

// Minimal valid WebP image (1x1 pixel)
const TINY_WEBP = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64')

// Minimal 1x1 PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==',
  'base64',
)

describe('Diagram WebP image upload (integration)', () => {
  let apiKey: string
  let campaignId: string

  beforeAll(async () => {
    const email = `webp-${uid()}@test.com`
    const cookie = await signUpAndGetCookie(email, 'password123', `WebP User ${uid()}`)
    const key = await createApiKey(cookie)
    apiKey = key.key
    const campaign = await createCampaign(apiKey, `WebP Campaign ${uid()}`)
    campaignId = campaign.id
  })

  it('accepts WebP image upload and returns URL', async () => {
    const form = new FormData()
    form.append('file', new Blob([TINY_WEBP], { type: 'image/webp' }), 'converted.webp')

    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
    })

    expect(res.status).toBe(200)
    const data = (await res.json()) as { url: string; filename: string }
    expect(data.url).toContain('/api/campaigns/')
    expect(data.url).toContain('/images/')
  })

  it('serves uploaded WebP image with correct content-type', async () => {
    const form = new FormData()
    form.append('file', new Blob([TINY_WEBP], { type: 'image/webp' }), 'serve-test.webp')

    const uploadRes = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
    })
    const { url } = (await uploadRes.json()) as { url: string }

    const imgRes = await fetch(`${BASE_URL}${url}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(imgRes.status).toBe(200)
    expect(imgRes.headers.get('content-type')).toContain('image/webp')
  })

  it('still accepts PNG uploads (for GIF passthrough and fallback)', async () => {
    const form = new FormData()
    form.append('file', new Blob([TINY_PNG], { type: 'image/png' }), 'fallback.png')

    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
    })

    expect(res.status).toBe(200)
    const data = (await res.json()) as { url: string }
    expect(data.url).toBeTruthy()
  })
})
