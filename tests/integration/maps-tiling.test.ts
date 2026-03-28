import { describe, it, expect, beforeAll } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE_URL = (globalThis as any).process?.env?.TEST_BASE_URL ?? 'http://localhost:3333'

async function api(path: string, opts?: any) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function apiRaw(path: string, opts?: RequestInit) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { Origin: BASE_URL, ...opts?.headers },
  })
}

// Minimal valid 1×1 PNG decoded without Buffer/Node APIs
function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64)
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)))
}

const TINY_PNG = base64ToUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
)

// dirname + join without importing path (avoids @types/node requirement)
function fsdir(p: string) {
  return p.replace(/[/\\][^/\\]+$/, '')
}
function fsjoin(...parts: string[]) {
  return parts.join('/').replace(/\/+/g, '/')
}

describe('Map Tiling Background Task (5.2)', () => {
  const email = `map-tiling-${Date.now()}@example.com`
  let cookie = ''
  let campaignId = ''
  let mapSlug = ''
  let mapId = ''
  let uploadedImagePath = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Tiling Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    cookie = `better-auth.session_token=${(login.headers.get('set-cookie') || '').match(/better-auth\.session_token=([^;]+)/)?.[1]}`

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { name: `Tiling Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    const mapRes = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { name: 'Tile Map' },
    })
    const mapData = await mapRes.json()
    mapSlug = mapData.slug
    mapId = mapData.id
  })

  it('upload accepts a valid PNG and returns image dimensions', async () => {
    const form = new FormData()
    form.append('image', new Blob([TINY_PNG.buffer as ArrayBuffer], { type: 'image/png' }), 'test.png')

    const res = await apiRaw(`/api/campaigns/${campaignId}/maps/${mapSlug}/upload`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.width).toBeGreaterThan(0)
    expect(data.height).toBeGreaterThan(0)
    uploadedImagePath = data.imagePath
    expect(uploadedImagePath).toBeTruthy()
  })

  it('map isTiled becomes true after background tiling completes', async () => {
    // Always-tile: isTiled starts false and flips to true once the background task finishes.
    // For a 1×1 PNG this happens near-instantly; poll for up to 5s.
    let isTiled = false
    for (let i = 0; i < 10; i++) {
      const res = await api(`/api/campaigns/${campaignId}/maps/${mapSlug}`, {
        method: 'GET',
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      if (data.isTiled) { isTiled = true; break }
      await new Promise(r => setTimeout(r, 500))
    }
    expect(isTiled).toBe(true)
  })

  it('maps:tile task endpoint returns success or is not registered', async () => {
    // The /_nitro/tasks endpoint requires `nitro.experimental.tasks: true`.
    // Skip gracefully if not available or returns HTML (non-JSON).
    const outputDir = fsjoin(fsdir(uploadedImagePath || '/tmp/x'), 'tiles')

    const res = await fetch(`${BASE_URL}/_nitro/tasks/maps:tile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: { mapId, imagePath: uploadedImagePath, outputDir },
      }),
    })

    if (res.status === 404) {
      console.warn('Skipping: maps:tile task endpoint not registered')
      return
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      console.warn('Skipping: /_nitro/tasks endpoint returned non-JSON (tasks not enabled)')
      return
    }

    expect(res.status).toBe(200)
    const result = await res.json()
    expect(result.result).toBe('success')
  })

  it('upload rejects non-image file', async () => {
    const form = new FormData()
    form.append('image', new Blob(['not an image'], { type: 'text/plain' }), 'bad.txt')

    const res = await apiRaw(`/api/campaigns/${campaignId}/maps/${mapSlug}/upload`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    expect(res.status).toBe(400)
  })
})
