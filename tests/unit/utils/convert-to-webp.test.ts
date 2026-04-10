import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { convertToWebP } from '../../../app/utils/convert-to-webp'

function makeBlob(type: string, size = 100): Blob {
  return new Blob([new Uint8Array(size)], { type })
}

describe('convertToWebP', () => {
  const originalOffscreenCanvas = globalThis.OffscreenCanvas

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (originalOffscreenCanvas) {
      globalThis.OffscreenCanvas = originalOffscreenCanvas
    } else {
      delete (globalThis as Record<string, unknown>).OffscreenCanvas
    }
  })

  it('passes through GIF files unchanged', async () => {
    const gif = makeBlob('image/gif', 200)
    const result = await convertToWebP(gif)
    expect(result).toBe(gif)
    expect(result.type).toBe('image/gif')
  })

  it('passes through non-image files unchanged', async () => {
    const pdf = makeBlob('application/pdf', 200)
    const result = await convertToWebP(pdf)
    expect(result).toBe(pdf)
  })

  it('converts PNG to WebP via OffscreenCanvas', async () => {
    const webpBlob = new Blob([new Uint8Array(50)], { type: 'image/webp' })
    const mockCtx = { drawImage: vi.fn() }
    const mockConvertToBlob = vi.fn().mockResolvedValue(webpBlob)
    const mockBitmap = { width: 100, height: 100, close: vi.fn() }

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

    // Use a proper class mock for OffscreenCanvas
    globalThis.OffscreenCanvas = class MockOffscreenCanvas {
      width: number
      height: number
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
      }
      getContext() {
        return mockCtx
      }
      convertToBlob = mockConvertToBlob
    } as unknown as typeof OffscreenCanvas

    const png = makeBlob('image/png', 200)
    const result = await convertToWebP(png)

    expect(result).toBe(webpBlob)
    expect(result.type).toBe('image/webp')
    expect(mockConvertToBlob).toHaveBeenCalledWith({ type: 'image/webp', quality: 0.82 })
    expect(mockBitmap.close).toHaveBeenCalled()
  })

  it('converts JPEG to WebP via OffscreenCanvas', async () => {
    const webpBlob = new Blob([new Uint8Array(30)], { type: 'image/webp' })
    const mockBitmap = { width: 200, height: 150, close: vi.fn() }

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

    globalThis.OffscreenCanvas = class MockOffscreenCanvas {
      width: number
      height: number
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
      }
      getContext() {
        return { drawImage: vi.fn() }
      }
      convertToBlob = vi.fn().mockResolvedValue(webpBlob)
    } as unknown as typeof OffscreenCanvas

    const jpeg = makeBlob('image/jpeg', 200)
    const result = await convertToWebP(jpeg)

    expect(result).toBe(webpBlob)
    expect(result.type).toBe('image/webp')
  })

  it('falls back to HTMLCanvasElement when OffscreenCanvas is unavailable', async () => {
    const webpBlob = new Blob([new Uint8Array(40)], { type: 'image/webp' })
    const mockBitmap = { width: 50, height: 50, close: vi.fn() }

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

    // Remove OffscreenCanvas to trigger fallback
    delete (globalThis as Record<string, unknown>).OffscreenCanvas

    const mockCtx = { drawImage: vi.fn() }
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => mockCtx,
      toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(webpBlob)),
    }
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockCanvas),
    })

    const png = makeBlob('image/png', 200)
    const result = await convertToWebP(png)

    expect(result).toBe(webpBlob)
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.82)
  })

  it('returns original file when createImageBitmap fails', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode failed')))

    const png = makeBlob('image/png', 200)
    const result = await convertToWebP(png)
    expect(result).toBe(png)
  })

  it('returns original file when convertToBlob returns empty blob', async () => {
    const emptyBlob = new Blob([], { type: 'image/webp' })
    const mockBitmap = { width: 10, height: 10, close: vi.fn() }

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

    globalThis.OffscreenCanvas = class MockOffscreenCanvas {
      width: number
      height: number
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
      }
      getContext() {
        return { drawImage: vi.fn() }
      }
      convertToBlob = vi.fn().mockResolvedValue(emptyBlob)
    } as unknown as typeof OffscreenCanvas

    const png = makeBlob('image/png', 200)
    const result = await convertToWebP(png)
    expect(result).toBe(png)
  })

  it('returns original file when getContext returns null', async () => {
    const mockBitmap = { width: 10, height: 10, close: vi.fn() }

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))

    globalThis.OffscreenCanvas = class MockOffscreenCanvas {
      width: number
      height: number
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
      }
      getContext() {
        return null
      }
      convertToBlob = vi.fn()
    } as unknown as typeof OffscreenCanvas

    const png = makeBlob('image/png', 200)
    const result = await convertToWebP(png)
    expect(result).toBe(png)
  })
})
