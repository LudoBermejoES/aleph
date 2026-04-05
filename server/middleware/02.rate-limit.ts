import { createRateLimiter } from '../utils/rate-limit'

const authLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })
const uploadLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 })
const generalLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 100 })

const UPLOAD_SUFFIXES = ['/upload', '/image', '/portrait']

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/')) return
  if (path === '/api/health') return

  const ip =
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    getRequestHeader(event, 'x-real-ip') ||
    'unknown'

  // Skip rate limiting for localhost in test/dev environments
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return

  let result

  if (path.startsWith('/api/auth/')) {
    result = authLimiter.checkRateLimit(ip)
  } else if (UPLOAD_SUFFIXES.some((s) => path.endsWith(s))) {
    result = uploadLimiter.checkRateLimit(ip)
  } else {
    result = generalLimiter.checkRateLimit(ip)
  }

  if (!result.allowed) {
    setResponseHeader(event, 'Retry-After', String(result.retryAfter))
    throw createError({ statusCode: 429, message: 'Too many requests' })
  }
})
