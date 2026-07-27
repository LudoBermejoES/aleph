interface WindowEntry {
  timestamps: number[]
}

interface RateLimiterOptions {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfter: number
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests } = options
  const store = new Map<string, WindowEntry>()

  function prune(): void {
    const now = Date.now()
    const cutoff = now - windowMs
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }

  function checkRateLimit(key: string): RateLimitResult {
    const now = Date.now()
    const cutoff = now - windowMs

    // Amortized cleanup
    prune()

    const entry = store.get(key) ?? { timestamps: [] }
    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

    if (entry.timestamps.length >= maxRequests) {
      const oldest = entry.timestamps[0]!
      const retryAfter = Math.ceil((oldest + windowMs - now) / 1000)
      return { allowed: false, retryAfter: Math.max(1, retryAfter) }
    }

    entry.timestamps.push(now)
    store.set(key, entry)
    return { allowed: true, retryAfter: 0 }
  }

  return { checkRateLimit, prune }
}

/**
 * Which bucket a request is charged to.
 *
 * `upload` is the write budget (multipart image writes hit disk), `image` is the
 * read budget for the same paths (serving image bytes back), `general` is
 * everything else and `exempt` is not counted at all.
 */
export type RateLimitBucket = 'exempt' | 'auth' | 'upload' | 'image' | 'general'

export const RATE_LIMITS: Record<Exclude<RateLimitBucket, 'exempt'>, RateLimiterOptions> = {
  // /api/auth/* is not only credential submission: better-auth's `get-session`
  // fires on every route navigation and every SSR hydration (app/middleware/
  // auth.global.ts), so ordinary browsing spends this budget. 120/min still
  // caps credential guessing at 2/s per IP, and better-auth hashes passwords,
  // which makes that rate expensive for an attacker and cheap for us.
  auth: { windowMs: 60_000, maxRequests: 120 },
  // Image/file WRITES. A DM adding portraits for a whole party, or a campaign
  // import pushing entity art, legitimately fires dozens of POSTs in a burst.
  // 120/min bounds disk-write abuse to 2/s; each upload is separately size- and
  // magic-byte-validated.
  upload: { windowMs: 60_000, maxRequests: 120 },
  // Image READS. A tiled map viewport (one GET per tile per pan/zoom) plus a
  // wiki page full of thumbnails can issue several hundred GETs in one burst.
  // These are cached file reads, so a generous ceiling is cheap.
  image: { windowMs: 60_000, maxRequests: 1200 },
  // Everything else: SSR page loads fan out into several API calls each, and a
  // household or office shares one IP behind NAT. 1000/min leaves headroom for
  // that while still catching a runaway client loop or a scraper.
  general: { windowMs: 60_000, maxRequests: 1000 },
}

/** Write endpoints that accept an image body; also the read path for most of them. */
const IMAGE_SUFFIXES = ['/upload', '/image', '/images', '/portrait']

/** Read-only endpoints that serve image bytes under a variable last segment. */
const IMAGE_SERVE_PATTERNS = [
  // GET /api/campaigns/:id/images/:filename
  /\/images\/[^/]+$/,
  // GET /api/campaigns/:id/maps/:slug/tiles/:z/:x/:y
  /\/tiles\/[^/]+\/[^/]+\/[^/]+$/,
]

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Decide which bucket a request belongs in.
 *
 * Classification is by HTTP **method**, not by path substring: several image
 * paths (`.../entities/:slug/image`, `.../characters/:slug/portrait`, ...) are
 * both the upload URL and the serving URL, so keying only on the path charges
 * every rendered thumbnail to the upload budget and the next real upload gets a
 * 429 that never clears.
 */
export function classifyRequest(pathname: string, method: string): RateLimitBucket {
  if (!pathname.startsWith('/api/')) return 'exempt'

  // Normalise a trailing slash so `/…/image/` classifies like `/…/image`.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (path === '/api/health') return 'exempt'
  if (path.startsWith('/api/auth/')) return 'auth'

  const isImagePath =
    IMAGE_SUFFIXES.some((s) => path.endsWith(s)) || IMAGE_SERVE_PATTERNS.some((re) => re.test(path))

  if (isImagePath) return READ_METHODS.has(method.toUpperCase()) ? 'image' : 'upload'

  return 'general'
}
