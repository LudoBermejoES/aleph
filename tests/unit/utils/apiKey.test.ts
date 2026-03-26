import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { generateApiKey, hashApiKey } from '../../../server/utils/apiKey'

describe('generateApiKey', () => {
  it('returns an object with raw, hash, and prefix', () => {
    const result = generateApiKey()
    expect(result).toHaveProperty('raw')
    expect(result).toHaveProperty('hash')
    expect(result).toHaveProperty('prefix')
  })

  it('raw key starts with aleph_', () => {
    const { raw } = generateApiKey()
    expect(raw).toMatch(/^aleph_/)
  })

  it('raw key has 64 hex chars after aleph_', () => {
    const { raw } = generateApiKey()
    const hex = raw.slice(6) // remove 'aleph_'
    expect(hex).toMatch(/^[0-9a-f]{64}$/)
  })

  it('prefix is first 14 chars of raw key', () => {
    const { raw, prefix } = generateApiKey()
    expect(prefix).toBe(raw.slice(0, 14))
  })

  it('hash matches sha256 of raw key', () => {
    const { raw, hash } = generateApiKey()
    const expected = createHash('sha256').update(raw).digest('hex')
    expect(hash).toBe(expected)
  })

  it('generates unique keys each time', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.raw).not.toBe(b.raw)
    expect(a.hash).not.toBe(b.hash)
  })
})

describe('hashApiKey', () => {
  it('produces a 64-char hex sha256 hash', () => {
    const hash = hashApiKey('aleph_abc123')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for the same input', () => {
    const key = 'aleph_test_key_value'
    expect(hashApiKey(key)).toBe(hashApiKey(key))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashApiKey('aleph_aaa')).not.toBe(hashApiKey('aleph_bbb'))
  })

  it('matches expected sha256 value', () => {
    const raw = 'aleph_hello'
    const expected = createHash('sha256').update(raw).digest('hex')
    expect(hashApiKey(raw)).toBe(expected)
  })
})
