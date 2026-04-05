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
      entry.timestamps = entry.timestamps.filter(t => t > cutoff)
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
    entry.timestamps = entry.timestamps.filter(t => t > cutoff)

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
