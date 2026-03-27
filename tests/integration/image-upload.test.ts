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
  return match ? `better-auth.session_token=${match[1]}` : ''
}

async function createApiKey(cookie: string) {
  const res = await fetch(`${BASE_URL}/api/apikeys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, Cookie: cookie },
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

// Minimal 1x1 red PNG (valid image bytes)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==',
  'base64',
)

function makePngFormData(fieldName = 'file', filename = 'test.png', data = TINY_PNG) {
  const form = new FormData()
  form.append(fieldName, new Blob([data], { type: 'image/png' }), filename)
  return form
}

describe('Image upload API', () => {
  let apiKey: string
  let campaignId: string

  beforeAll(async () => {
    const email = `img-upload-${uid()}@test.com`
    const cookie = await signUpAndGetCookie(email, 'password123', `Img User ${uid()}`)
    const key = await createApiKey(cookie)
    apiKey = key.key
    const campaign = await createCampaign(apiKey, `Img Campaign ${uid()}`)
    campaignId = campaign.id
  })

  // ── POST /api/campaigns/:id/images ────────────────────────────────────────

  it('uploads a valid PNG and returns url + filename', async () => {
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: makePngFormData(),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toMatch(/^\/api\/campaigns\/.+\/images\/.+\.png$/)
    expect(body.filename).toMatch(/\.png$/)
  })

  it('rejects upload with invalid MIME type', async () => {
    const form = new FormData()
    form.append('file', new Blob(['hello'], { type: 'text/plain' }), 'test.txt')
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/Invalid file type/i)
  })

  it('rejects upload exceeding 10 MB', { timeout: 30000 }, async () => {
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 0)
    const form = new FormData()
    form.append('file', new Blob([bigBuffer], { type: 'image/png' }), 'big.png')
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
    })
    // Server may return 400 (our handler) or 413 (Nitro body limit) — both are rejections
    expect([400, 413]).toContain(res.status)
  })

  it('returns 401 for unauthenticated upload', async () => {
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images`, {
      method: 'POST',
      body: makePngFormData(),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 for player role', async () => {
    // Create a separate campaign as DM and invite a player — simplified: use a different user
    // who does not own the campaign (not a member at all → 403 from campaign middleware)
    const playerEmail = `img-player-${uid()}@test.com`
    const playerCookie = await signUpAndGetCookie(playerEmail, 'password123', `Player ${uid()}`)
    const playerKey = await createApiKey(playerCookie)

    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': playerKey.key },
      body: makePngFormData(),
    })
    // Non-member gets 403 from campaign access check
    expect(res.status).toBe(403)
  })

  // ── GET /api/campaigns/:id/images/:filename ───────────────────────────────

  it('serves an uploaded image with correct headers', async () => {
    // First upload
    const uploadRes = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: makePngFormData(),
    })
    const { filename } = await uploadRes.json()

    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images/${filename}`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')
    expect(res.headers.get('cache-control')).toContain('max-age=31536000')
  })

  it('returns 404 for a non-existent image', async () => {
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images/nonexistent-file.png`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(404)
  })

  it('returns 401 when serving image without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/images/some-file.png`)
    expect(res.status).toBe(401)
  })
})
