import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateWsToken,
  validateWsToken,
  cleanExpiredTokens,
} from '../../../server/services/ws-token'

describe('WebSocket token service', () => {
  beforeEach(() => {
    cleanExpiredTokens()
  })

  it('generateWsToken returns a token string', () => {
    const token = generateWsToken('user-1')
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)
  })

  it('validateWsToken returns userId for valid token', () => {
    const token = generateWsToken('user-42')
    const userId = validateWsToken(token)
    expect(userId).toBe('user-42')
  })

  it('validateWsToken returns null for invalid token', () => {
    expect(validateWsToken('bogus-token')).toBeNull()
  })

  it('validateWsToken returns null for expired token', () => {
    vi.useFakeTimers()
    const token = generateWsToken('user-1')

    // Advance past expiry (tokens last 30s)
    vi.advanceTimersByTime(31_000)

    expect(validateWsToken(token)).toBeNull()
    vi.useRealTimers()
  })

  it('token is single-use (consumed after validation)', () => {
    const token = generateWsToken('user-1')
    expect(validateWsToken(token)).toBe('user-1')
    // Second use returns null
    expect(validateWsToken(token)).toBeNull()
  })

  it('cleanExpiredTokens removes old tokens', () => {
    vi.useFakeTimers()
    generateWsToken('user-1')
    generateWsToken('user-2')

    vi.advanceTimersByTime(31_000)

    const token3 = generateWsToken('user-3')
    cleanExpiredTokens()

    // Expired tokens gone, fresh one still valid
    expect(validateWsToken(token3)).toBe('user-3')
    vi.useRealTimers()
  })
})
