/**
 * Server-side geocoding against Nominatim (OpenStreetMap's geocoder). See
 * openspec/changes/add-osm-maps/design.md D3 for why this MUST run on the server rather
 * than the browser: `fetch()` from a browser cannot set the `User-Agent` header (it is one
 * of the "forbidden" headers the fetch standard reserves for the user agent itself), and
 * Nominatim's usage policy requires a `User-Agent` that identifies the calling application.
 *
 * This module also enforces the rest of that usage policy:
 *  - at most one outbound request per second, in aggregate across the whole process (not
 *    per user, not per campaign -- Nominatim rate-limits by source IP)
 *  - a per-normalized-query cache so a repeated search never re-hits the provider
 *
 * Pattern mirrors `server/utils/ai.ts`: callers may pass an explicit config (used by
 * tests, and by anything that wants a fresh view of runtimeConfig), or omit it and let this
 * module read `useRuntimeConfig()` itself.
 */

export interface GeocodeCandidate {
  displayName: string
  lat: number
  lng: number
}

export interface GeocodingConfig {
  /** Base search URL, e.g. https://nominatim.openstreetmap.org/search */
  nominatimUrl: string
  /** User-Agent sent on every outbound request. Nominatim requires one that identifies the app. */
  userAgent: string
}

const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const DEFAULT_USER_AGENT = 'Aleph-TTRPG-Campaign-Manager/1.0'

/** Minimum spacing between two outbound requests to the geocoding provider. */
export const MIN_REQUEST_INTERVAL_MS = 1000

/** How long a resolved result is served from cache before it is considered stale. */
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours -- an address doesn't move

interface CacheEntry {
  result: GeocodeCandidate[]
  expiresAt: number
}

// Process-wide state, intentionally module-level (design.md D3/D8: a single Nitro process
// today; a multi-replica deployment would need a shared limiter/cache instead of these).
const cache = new Map<string, CacheEntry>()
let lastRequestAt = 0
// Serializes concurrent callers so the 1 req/s spacing holds in aggregate, not per-caller.
let requestQueue: Promise<void> = Promise.resolve()

export function normalizeGeocodeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Waits, if needed, so the next outbound request is spaced >= MIN_REQUEST_INTERVAL_MS
 * after the previous one -- across ALL concurrent callers, not just this one. */
function throttle(): Promise<void> {
  const wait = requestQueue.then(async () => {
    const elapsed = Date.now() - lastRequestAt
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed))
    }
    lastRequestAt = Date.now()
  })
  // Keep the queue alive even if this particular wait rejects (it never should).
  requestQueue = wait.catch(() => {})
  return wait
}

function resolveConfig(config?: Partial<GeocodingConfig>): GeocodingConfig {
  if (config?.nominatimUrl && config?.userAgent) {
    return { nominatimUrl: config.nominatimUrl, userAgent: config.userAgent }
  }
  const runtime = (
    useRuntimeConfig() as unknown as {
      maps?: { nominatimUrl?: string; nominatimUserAgent?: string; nominatimContact?: string }
    }
  ).maps
  const contact = runtime?.nominatimContact?.trim()
  const baseUserAgent = runtime?.nominatimUserAgent?.trim() || DEFAULT_USER_AGENT
  return {
    nominatimUrl: config?.nominatimUrl || runtime?.nominatimUrl || DEFAULT_NOMINATIM_URL,
    userAgent: config?.userAgent || (contact ? `${baseUserAgent} (${contact})` : baseUserAgent),
  }
}

/**
 * Resolve a free-text address or city name to one or more candidate coordinates.
 * Never called more than once per second in aggregate, and never repeated for the same
 * normalized query within CACHE_TTL_MS.
 */
export async function geocodeAddress(
  query: string,
  config?: Partial<GeocodingConfig>,
): Promise<GeocodeCandidate[]> {
  const normalized = normalizeGeocodeQuery(query)
  if (!normalized) return []

  const cached = cache.get(normalized)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  await throttle()

  const { nominatimUrl, userAgent } = resolveConfig(config)
  const url = new URL(nominatimUrl)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    throw createError({
      statusCode: 502,
      message: `Geocoding provider unreachable: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  if (!res.ok) {
    throw createError({
      statusCode: 502,
      message: `Geocoding provider returned an error: ${res.status}`,
    })
  }

  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[]
  const result: GeocodeCandidate[] = data.map((d) => ({
    displayName: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }))

  cache.set(normalized, { result, expiresAt: Date.now() + CACHE_TTL_MS })
  return result
}

/** Test-only: resets the process-wide throttle/cache state between test cases. */
export function __resetGeocodingStateForTests(): void {
  cache.clear()
  lastRequestAt = 0
  requestQueue = Promise.resolve()
}
