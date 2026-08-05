import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import {
  createRateLimiter,
  classifyRequest,
  RATE_LIMITS,
  type RateLimitBucket,
} from '../../server/utils/rate-limit'

/**
 * The rate limiter's POSITION in the middleware chain is part of the fix, so it is
 * pinned here rather than merely achieved by a filename.
 *
 * Nitro orders `server/middleware/` by filename — `scanDir()` ends with
 * `.sort((a, b) => a.path.localeCompare(b.path))` — and this test uses the same
 * comparator, so it asserts the real execution order rather than a convention.
 *
 * When the limiter sorted after the auth middleware it never ran for unauthenticated
 * traffic at all: the auth middleware throws 401 for any `/api/*` request without a
 * valid session or API key, so no unauthenticated flood of a non-auth endpoint was ever
 * counted, and each request still paid a DB lookup before being rejected. Renaming the
 * limiter back behind auth must fail this test.
 */
describe('middleware ordering: the rate limiter runs before authentication', () => {
  const dir = resolve(__dirname, '../../server/middleware')
  // Identify the two middlewares by what they DO, not by their names — the names are
  // exactly what this test exists to police.
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'))
  const sources = new Map(files.map((f) => [f, readFileSync(join(dir, f), 'utf-8')]))

  const limiterFile = files.find((f) => sources.get(f)!.includes('createRateLimiter'))
  const authFile = files.find((f) => /statusCode: 401/.test(sources.get(f)!))

  it('finds exactly one rate-limiting and one authenticating middleware', () => {
    expect(files.filter((f) => sources.get(f)!.includes('createRateLimiter'))).toHaveLength(1)
    expect(files.filter((f) => /statusCode: 401/.test(sources.get(f)!))).toHaveLength(1)
  })

  it("sorts before the auth middleware under nitro's comparator", () => {
    expect(
      limiterFile!.localeCompare(authFile!),
      `${limiterFile} must sort before ${authFile}. Nitro runs server middleware in ` +
        `localeCompare order of filename, and ${authFile} throws 401 for unauthenticated ` +
        `/api/* requests — so a limiter behind it never sees unauthenticated traffic and ` +
        `that traffic is unmetered.`,
    ).toBeLessThan(0)
  })

  it('the limiter needs nothing from authentication, so running first is safe', () => {
    // If the limiter ever keys on identity it can no longer precede auth, and this fix
    // would have to be rethought instead of quietly reverted. Comments are stripped
    // first: the middleware's own header explains why it reads neither of these, and
    // that explanation would otherwise satisfy the assertion.
    const limiter = sources
      .get(limiterFile!)!
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(limiter).not.toContain('context.user')
    expect(limiter).not.toContain('context.session')
  })
})

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests within the limit', () => {
    const { checkRateLimit } = createRateLimiter({ windowMs: 60_000, maxRequests: 3 })
    expect(checkRateLimit('ip1').allowed).toBe(true)
    expect(checkRateLimit('ip1').allowed).toBe(true)
    expect(checkRateLimit('ip1').allowed).toBe(true)
  })

  it('blocks request that exceeds the limit', () => {
    const { checkRateLimit } = createRateLimiter({ windowMs: 60_000, maxRequests: 2 })
    checkRateLimit('ip1')
    checkRateLimit('ip1')
    const result = checkRateLimit('ip1')
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('resets after window expires', () => {
    const { checkRateLimit } = createRateLimiter({ windowMs: 60_000, maxRequests: 1 })
    checkRateLimit('ip1')
    expect(checkRateLimit('ip1').allowed).toBe(false)
    vi.advanceTimersByTime(61_000)
    expect(checkRateLimit('ip1').allowed).toBe(true)
  })

  it('tracks different keys independently', () => {
    const { checkRateLimit } = createRateLimiter({ windowMs: 60_000, maxRequests: 1 })
    expect(checkRateLimit('ip1').allowed).toBe(true)
    expect(checkRateLimit('ip2').allowed).toBe(true)
    expect(checkRateLimit('ip1').allowed).toBe(false)
    expect(checkRateLimit('ip2').allowed).toBe(false)
  })

  it('auth limiter has stricter threshold (10/60s)', () => {
    const { checkRateLimit } = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })
    for (let i = 0; i < 10; i++) checkRateLimit('ip1')
    expect(checkRateLimit('ip1').allowed).toBe(false)
  })

  it('general limiter allows 100 requests', () => {
    const { checkRateLimit } = createRateLimiter({ windowMs: 60_000, maxRequests: 100 })
    for (let i = 0; i < 100; i++) {
      expect(checkRateLimit('ip1').allowed).toBe(true)
    }
    expect(checkRateLimit('ip1').allowed).toBe(false)
  })

  it('prune removes expired entries', () => {
    const { checkRateLimit, prune } = createRateLimiter({ windowMs: 1_000, maxRequests: 5 })
    checkRateLimit('ip1')
    vi.advanceTimersByTime(2_000)
    prune()
    // Should be allowed again after window expired and prune ran
    expect(checkRateLimit('ip1').allowed).toBe(true)
  })
})

// Every image-bearing API route that actually exists on disk, paired with the
// methods it answers. Written out literally (not derived) so that adding a
// route without revisiting the limiter shows up as a missing case here.
const REAL_IMAGE_ROUTES: Array<{ path: string; methods: string[]; file: string }> = [
  {
    path: '/api/campaigns/c1/characters/gwen/portrait',
    methods: ['GET', 'POST'],
    file: 'characters/[slug]/portrait.{get,post}.ts',
  },
  {
    path: '/api/campaigns/c1/entities/the-spire/image',
    methods: ['GET', 'POST'],
    file: 'entities/[slug]/image.{get,post}.ts',
  },
  {
    path: '/api/campaigns/c1/organizations/the-camarilla/image',
    methods: ['GET', 'POST'],
    file: 'organizations/[slug]/image.{get,post}.ts',
  },
  {
    path: '/api/campaigns/c1/sub-campaigns/arc-one/image',
    methods: ['GET', 'POST'],
    file: 'sub-campaigns/[slug]/image.{get,post}.ts',
  },
  {
    path: '/api/campaigns/c1/maps/atlas/image',
    methods: ['GET'],
    file: 'maps/[slug]/image.get.ts',
  },
  {
    path: '/api/campaigns/c1/maps/atlas/upload',
    methods: ['POST'],
    file: 'maps/[slug]/upload.post.ts',
  },
  { path: '/api/campaigns/c1/images', methods: ['POST'], file: 'images/index.post.ts' },
  {
    path: '/api/campaigns/c1/images/pasted-1234.webp',
    methods: ['GET'],
    file: 'images/[filename].get.ts',
  },
  {
    path: '/api/campaigns/c1/maps/atlas/tiles/3/5/7',
    methods: ['GET'],
    file: 'maps/[slug]/tiles/[z]/[x]/[y].get.ts',
  },
]

describe('classifyRequest', () => {
  it('leaves non-API and health requests uncounted', () => {
    expect(classifyRequest('/campaigns/c1', 'GET')).toBe('exempt')
    expect(classifyRequest('/api/health', 'GET')).toBe('exempt')
  })

  it('routes /api/auth/* to the auth bucket', () => {
    expect(classifyRequest('/api/auth/sign-in/email', 'POST')).toBe('auth')
    expect(classifyRequest('/api/auth/get-session', 'GET')).toBe('auth')
  })

  it('routes ordinary API traffic to the general bucket', () => {
    expect(classifyRequest('/api/campaigns', 'GET')).toBe('general')
    expect(classifyRequest('/api/campaigns/c1/entities/the-spire', 'PUT')).toBe('general')
  })

  // The defect this suite exists for: several image paths are BOTH the upload
  // URL and the serving URL, so classifying on the path alone charged every
  // rendered thumbnail to the upload (write) budget.
  it.each(
    REAL_IMAGE_ROUTES.flatMap(({ path, methods, file }) =>
      methods.map((m) => ({ path, method: m, file })),
    ),
  )('classifies $method $path ($file) by method', ({ path, method }) => {
    const expected: RateLimitBucket = method === 'GET' ? 'image' : 'upload'
    expect(classifyRequest(path, method)).toBe(expected)
  })

  it('never charges a read to the upload bucket', () => {
    for (const { path, methods } of REAL_IMAGE_ROUTES) {
      if (!methods.includes('GET')) continue
      expect(classifyRequest(path, 'GET')).not.toBe('upload')
      expect(classifyRequest(path, 'HEAD')).not.toBe('upload')
    }
  })

  it('has no classification rule that matches none of the real routes', () => {
    // Guards against a dead rule like `path.includes('/images/')`, which was
    // written to exempt image serving but did not match the singular
    // `/image` and `/portrait` routes at all.
    const buckets = new Set(
      REAL_IMAGE_ROUTES.flatMap(({ path, methods }) =>
        methods.map((m) => classifyRequest(path, m)),
      ),
    )
    expect(buckets).toEqual(new Set(['image', 'upload']))
  })

  it('normalises a trailing slash', () => {
    expect(classifyRequest('/api/campaigns/c1/entities/the-spire/image/', 'GET')).toBe('image')
    expect(classifyRequest('/api/campaigns/c1/entities/the-spire/image/', 'POST')).toBe('upload')
  })
})

describe('rate limit buckets (as the middleware wires them)', () => {
  function makeLimiters() {
    return {
      auth: createRateLimiter(RATE_LIMITS.auth),
      upload: createRateLimiter(RATE_LIMITS.upload),
      image: createRateLimiter(RATE_LIMITS.image),
      general: createRateLimiter(RATE_LIMITS.general),
    }
  }

  /** Mirrors server/middleware/00.rate-limit.ts for a single IP. */
  function charge(limiters: ReturnType<typeof makeLimiters>, path: string, method: string) {
    const bucket = classifyRequest(path, method)
    if (bucket === 'exempt') return true
    return limiters[bucket].checkRateLimit('203.0.113.7').allowed
  }

  // Regression: browsing pages full of portraits used to drain the upload
  // budget, so the next upload POST returned 429 permanently rather than
  // intermittently.
  it('a page full of image GETs does not block the next upload', () => {
    const limiters = makeLimiters()
    const reads = RATE_LIMITS.upload.maxRequests + 50

    for (let i = 0; i < reads; i++) {
      expect(charge(limiters, `/api/campaigns/c1/characters/pc-${i}/portrait`, 'GET')).toBe(true)
      expect(charge(limiters, `/api/campaigns/c1/entities/npc-${i}/image`, 'GET')).toBe(true)
      expect(charge(limiters, `/api/campaigns/c1/images/pasted-${i}.webp`, 'GET')).toBe(true)
    }

    expect(charge(limiters, '/api/campaigns/c1/characters/gwen/portrait', 'POST')).toBe(true)
    expect(charge(limiters, '/api/campaigns/c1/entities/the-spire/image', 'POST')).toBe(true)
    expect(charge(limiters, '/api/campaigns/c1/maps/atlas/upload', 'POST')).toBe(true)
  })

  it('a tiled map viewport does not block ordinary API traffic', () => {
    const limiters = makeLimiters()
    for (let z = 0; z < 6; z++) {
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          expect(charge(limiters, `/api/campaigns/c1/maps/atlas/tiles/${z}/${x}/${y}`, 'GET')).toBe(
            true,
          )
        }
      }
    }
    expect(charge(limiters, '/api/campaigns/c1/entities', 'GET')).toBe(true)
  })

  it('still refuses genuine upload flooding', () => {
    const limiters = makeLimiters()
    for (let i = 0; i < RATE_LIMITS.upload.maxRequests; i++) {
      expect(charge(limiters, '/api/campaigns/c1/entities/the-spire/image', 'POST')).toBe(true)
    }
    expect(charge(limiters, '/api/campaigns/c1/entities/the-spire/image', 'POST')).toBe(false)
    // ...without having spent the read budget.
    expect(charge(limiters, '/api/campaigns/c1/entities/the-spire/image', 'GET')).toBe(true)
  })

  it('keeps auth stricter than general', () => {
    expect(RATE_LIMITS.auth.maxRequests).toBeLessThan(RATE_LIMITS.general.maxRequests)
    const limiters = makeLimiters()
    for (let i = 0; i < RATE_LIMITS.auth.maxRequests; i++) {
      expect(charge(limiters, '/api/auth/sign-in/email', 'POST')).toBe(true)
    }
    expect(charge(limiters, '/api/auth/sign-in/email', 'POST')).toBe(false)
    expect(charge(limiters, '/api/campaigns', 'GET')).toBe(true)
  })
})
