import { createRateLimiter, classifyRequest, RATE_LIMITS } from '../utils/rate-limit'

/**
 * Rate limiting, deliberately the FIRST middleware to touch a request.
 *
 * The `00.` prefix is load-bearing, not decoration. Nitro sorts `server/middleware/`
 * by filename (`scanDir` → `.sort((a, b) => a.path.localeCompare(b.path))`), so this
 * file has to sort before `01.auth.ts`. While it was `02.rate-limit.ts` it ran after
 * authentication, and `01.auth.ts` throws 401 for every unauthenticated `/api/*`
 * request — so the limiter never executed for that traffic at all. Unauthenticated
 * flooding of any non-auth endpoint was completely unmetered, and every request in the
 * flood still paid a DB API-key lookup or a full better-auth `getSession()` before
 * being rejected. (`/api/auth/*` was never affected: `01.auth.ts` skips it, so login
 * brute-force was always limited.)
 *
 * Running first is safe because this limiter takes no input from authentication: it
 * keys purely on the client IP and on `classifyRequest(path, method)`. Nothing here
 * reads `event.context.user`.
 *
 * Unauthenticated traffic therefore shares the same `general` bucket as everyone else
 * (1000 req/min/IP), and that is the intended answer rather than an oversight:
 *
 *  - Before authentication there IS no identity to bucket on. The only pre-auth signal
 *    is "does a cookie or X-API-Key header exist", which is entirely attacker-supplied
 *    — a flood can land in whichever bucket it prefers by sending a junk credential. A
 *    separate anonymous bucket would cost a bucket to reason about and buy nothing.
 *  - aleph's `general` ceiling of 1000/min was derived for per-IP traffic behind NAT
 *    where one SSR page load fans out into several API calls. Legitimate anonymous
 *    traffic to non-auth endpoints is a handful of 401s before the client redirects to
 *    /login, so the shared ceiling costs it nothing.
 *  - Credential submission has its own, stricter budget (`auth`, 120/min).
 *
 * What this bounds and what it does not: an unauthenticated flood from one IP now costs
 * at most 1000 pre-auth session lookups per minute instead of unbounded, but it is still
 * per-IP and per-process. A distributed flood, or one that rotates `X-Forwarded-For`
 * (which is client-supplied — see the localhost note below), is not addressed here.
 */
const limiters = {
  auth: createRateLimiter(RATE_LIMITS.auth),
  upload: createRateLimiter(RATE_LIMITS.upload),
  image: createRateLimiter(RATE_LIMITS.image),
  general: createRateLimiter(RATE_LIMITS.general),
}

const LOCALHOST = new Set(['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'])

export default defineEventHandler((event) => {
  const bucket = classifyRequest(getRequestURL(event).pathname, event.node.req.method || 'GET')
  if (bucket === 'exempt') return

  const ip =
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    getRequestHeader(event, 'x-real-ip') ||
    event.node.req.socket?.remoteAddress

  // Internal SSR / task invocations arrive with no peer at all. They are not
  // external traffic (the outer request that triggered them was already
  // counted) and lumping them together would collapse every user's SSR page
  // render into a single shared bucket.
  if (!ip) return

  // Skip rate limiting for localhost in test/dev environments. Not in
  // production: there the value comes from a client-supplied X-Forwarded-For,
  // so honouring it would let anyone opt out by claiming to be 127.0.0.1.
  if (process.env.NODE_ENV !== 'production' && LOCALHOST.has(ip)) return

  const result = limiters[bucket].checkRateLimit(ip)

  if (!result.allowed) {
    setResponseHeader(event, 'Retry-After', result.retryAfter)
    throw createError({ statusCode: 429, message: 'Too many requests' })
  }
})
