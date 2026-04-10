import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createAlephAssetStore } from '../../../app/utils/aleph-asset-store'
import { inlineBase64AssetStore } from 'tldraw'
import { convertToWebP } from '../../../app/utils/convert-to-webp'
import type { TLAsset } from 'tldraw'

// Mock tldraw before importing the module under test
vi.mock('tldraw', () => ({
  inlineBase64AssetStore: {
    upload: vi.fn().mockResolvedValue({ src: 'data:image/png;base64,fallback' }),
  },
}))

vi.mock('../../../app/utils/convert-to-webp', () => ({
  convertToWebP: vi.fn(),
}))

const mockConvertToWebP = vi.mocked(convertToWebP)
const mockInlineFallback = vi.mocked(inlineBase64AssetStore.upload)

function makeFile(name: string, type: string, size = 100): File {
  return new File([new Uint8Array(size)], name, { type })
}

const fakeAsset = { id: 'asset:test123', type: 'image' } as unknown as TLAsset

describe('createAlephAssetStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockInlineFallback.mockResolvedValue({ src: 'data:image/png;base64,fallback' })
  })

  it('converts to WebP and uploads to server', async () => {
    const webpBlob = new Blob([new Uint8Array(50)], { type: 'image/webp' })
    mockConvertToWebP.mockResolvedValue(webpBlob)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: '/api/campaigns/c1/images/abc.webp' }),
      }),
    )

    const store = createAlephAssetStore('c1')
    const result = await store.upload(fakeAsset, makeFile('photo.png', 'image/png'))

    expect(result.src).toBe('/api/campaigns/c1/images/abc.webp')
    expect(mockConvertToWebP).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith(
      '/api/campaigns/c1/images',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses .webp extension when conversion succeeds', async () => {
    const webpBlob = new Blob([new Uint8Array(50)], { type: 'image/webp' })
    mockConvertToWebP.mockResolvedValue(webpBlob)

    let uploadedFilename = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        const form = init.body as FormData
        const file = form.get('file') as File
        uploadedFilename = file.name
        return Promise.resolve({
          ok: true,
          json: async () => ({ url: '/api/campaigns/c1/images/out.webp' }),
        })
      }),
    )

    const store = createAlephAssetStore('c1')
    await store.upload(fakeAsset, makeFile('photo.png', 'image/png'))

    expect(uploadedFilename).toBe('photo.webp')
  })

  it('falls back to inline base64 on upload failure', async () => {
    const webpBlob = new Blob([new Uint8Array(50)], { type: 'image/webp' })
    mockConvertToWebP.mockResolvedValue(webpBlob)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    const store = createAlephAssetStore('c1')
    const file = makeFile('photo.png', 'image/png')
    const result = await store.upload(fakeAsset, file)

    expect(result.src).toBe('data:image/png;base64,fallback')
    expect(mockInlineFallback).toHaveBeenCalledWith(fakeAsset, file, undefined)
  })

  it('falls back to inline base64 on network error', async () => {
    mockConvertToWebP.mockResolvedValue(new Blob([new Uint8Array(50)], { type: 'image/webp' }))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const store = createAlephAssetStore('c1')
    const file = makeFile('photo.png', 'image/png')
    const result = await store.upload(fakeAsset, file)

    expect(result.src).toBe('data:image/png;base64,fallback')
    expect(mockInlineFallback).toHaveBeenCalled()
  })

  it('passes through GIFs without converting (via convertToWebP)', async () => {
    const gifFile = makeFile('anim.gif', 'image/gif')
    // convertToWebP returns the same file for GIFs
    mockConvertToWebP.mockResolvedValue(gifFile)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: '/api/campaigns/c1/images/anim.gif' }),
      }),
    )

    const store = createAlephAssetStore('c1')
    const result = await store.upload(fakeAsset, gifFile)

    expect(result.src).toBe('/api/campaigns/c1/images/anim.gif')
  })

  it('passes abort signal to fetch', async () => {
    mockConvertToWebP.mockResolvedValue(new Blob([new Uint8Array(50)], { type: 'image/webp' }))
    const controller = new AbortController()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: '/api/campaigns/c1/images/x.webp' }),
      }),
    )

    const store = createAlephAssetStore('c1')
    await store.upload(fakeAsset, makeFile('photo.png', 'image/png'), controller.signal)

    expect(fetch).toHaveBeenCalledWith(
      '/api/campaigns/c1/images',
      expect.objectContaining({ signal: controller.signal }),
    )
  })
})
