import { describe, it, expect, vi } from 'vitest'

// Mock h3 cookie/header helpers
const mockGetHeader = vi.fn()
const mockGetCookie = vi.fn()
vi.stubGlobal('getHeader', mockGetHeader)
vi.stubGlobal('getCookie', mockGetCookie)
vi.stubGlobal('setCookie', vi.fn())
vi.stubGlobal('createError', (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

const { generateCsrfToken, validateCsrf } = await import('../../server/utils/csrf')

describe('generateCsrfToken', () => {
  it('returns a hex string', () => {
    const token = generateCsrfToken()
    expect(token).toMatch(/^[0-9a-f]+$/)
  })

  it('returns 64 characters (32 bytes hex-encoded)', () => {
    const token = generateCsrfToken()
    expect(token).toHaveLength(64)
  })

  it('generates unique tokens', () => {
    const t1 = generateCsrfToken()
    const t2 = generateCsrfToken()
    expect(t1).not.toBe(t2)
  })
})

describe('validateCsrf', () => {
  it('passes when header matches cookie', () => {
    mockGetHeader.mockReturnValue('abc123')
    mockGetCookie.mockReturnValue('abc123')
    expect(() => validateCsrf({} as never)).not.toThrow()
  })

  it('throws 403 when header does not match cookie', () => {
    mockGetHeader.mockReturnValue('abc123')
    mockGetCookie.mockReturnValue('different')
    expect(() => validateCsrf({} as never)).toThrow()
    try {
      validateCsrf({} as never)
    } catch (e: unknown) {
      expect((e as { statusCode: number }).statusCode).toBe(403)
    }
  })

  it('throws 403 when header is missing', () => {
    mockGetHeader.mockReturnValue(undefined)
    mockGetCookie.mockReturnValue('abc123')
    expect(() => validateCsrf({} as never)).toThrow()
  })

  it('throws 403 when cookie is missing', () => {
    mockGetHeader.mockReturnValue('abc123')
    mockGetCookie.mockReturnValue(undefined)
    expect(() => validateCsrf({} as never)).toThrow()
  })
})
