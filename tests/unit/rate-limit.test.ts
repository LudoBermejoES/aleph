import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRateLimiter } from '../../server/utils/rate-limit'

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
