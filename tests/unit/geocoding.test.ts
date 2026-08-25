import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  geocodeAddress,
  normalizeGeocodeQuery,
  __resetGeocodingStateForTests,
  MIN_REQUEST_INTERVAL_MS,
} from '../../server/services/geocoding'

// Mock createError (Nuxt auto-import used in server/services/geocoding.ts)
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => {
  const err = new Error(message) as Error & { statusCode: number }
  err.statusCode = statusCode
  return err
})
// geocodeAddress falls back to useRuntimeConfig() (a real Nuxt instance) only when no
// explicit config is passed -- like server/utils/ai.ts's own unit tests, every call here
// passes one explicitly so the module never needs a live Nuxt app.
const TEST_CONFIG = { nominatimUrl: 'https://nominatim.test/search', userAgent: 'AlephTest/1.0' }

function mockNominatimResponse(results: { display_name: string; lat: string; lon: string }[]) {
  return { ok: true, json: async () => results }
}

describe('normalizeGeocodeQuery', () => {
  it('trims, lowercases, and collapses internal whitespace', () => {
    expect(normalizeGeocodeQuery('  Berlín,   Germany  ')).toBe('berlín, germany')
  })

  it('treats differently-cased/spaced queries as equal after normalization', () => {
    expect(normalizeGeocodeQuery('Alexanderplatz')).toBe(
      normalizeGeocodeQuery('  ALEXANDERPLATZ  '),
    )
  })
})

describe('geocodeAddress', () => {
  beforeEach(() => {
    __resetGeocodingStateForTests()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    __resetGeocodingStateForTests()
  })

  it('returns an empty array for a blank query without calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await geocodeAddress('   ')
    expect(result).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resolves candidates from the provider response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          mockNominatimResponse([{ display_name: 'Berlin, Germany', lat: '52.52', lon: '13.405' }]),
        ),
    )
    const result = await geocodeAddress('Berlin', TEST_CONFIG)
    expect(result).toEqual([{ displayName: 'Berlin, Germany', lat: 52.52, lng: 13.405 }])
  })

  it('sends a User-Agent header identifying the app (Nominatim usage policy)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockNominatimResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    await geocodeAddress('Berlin', {
      nominatimUrl: 'https://example.test/search',
      userAgent: 'TestAgent/1.0',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://example.test/search'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'TestAgent/1.0' }),
      }),
    )
  })

  it('throws a clear (non-500) error when the provider is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    await expect(geocodeAddress('Berlin', TEST_CONFIG)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('throws a clear error when the provider responds with a non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await expect(geocodeAddress('Berlin', TEST_CONFIG)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('caches by normalized query: a repeated search does not re-hit the provider', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        mockNominatimResponse([{ display_name: 'Berlin, Germany', lat: '52.52', lon: '13.405' }]),
      )
    vi.stubGlobal('fetch', fetchMock)

    const first = await geocodeAddress('  Berlin  ', TEST_CONFIG)
    const second = await geocodeAddress('BERLIN', TEST_CONFIG)

    expect(first).toEqual(second)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serializes concurrent calls to at most one outbound request per second', async () => {
    vi.useFakeTimers()
    const timestamps: number[] = []
    const fetchMock = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now())
      return mockNominatimResponse([])
    })
    vi.stubGlobal('fetch', fetchMock)

    const p1 = geocodeAddress('Query One', TEST_CONFIG)
    const p2 = geocodeAddress('Query Two', TEST_CONFIG)

    // Let the first request's throttle resolve immediately (no prior lastRequestAt).
    await vi.advanceTimersByTimeAsync(0)
    // Advance past the enforced 1s spacing for the second request.
    await vi.advanceTimersByTimeAsync(MIN_REQUEST_INTERVAL_MS)

    await Promise.all([p1, p2])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(MIN_REQUEST_INTERVAL_MS)

    vi.useRealTimers()
  })
})
