import { createRateLimiter, classifyRequest, RATE_LIMITS } from '../utils/rate-limit'

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
