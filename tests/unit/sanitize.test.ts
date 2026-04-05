import { describe, it, expect } from 'vitest'
import { escapeLike, detectMimeFromBytes } from '../../server/utils/sanitize'

describe('escapeLike', () => {
  it('passes through normal strings unchanged', () => {
    expect(escapeLike('hello world')).toBe('hello world')
  })

  it('escapes % characters', () => {
    expect(escapeLike('50% done')).toBe('50\\% done')
  })

  it('escapes _ characters', () => {
    expect(escapeLike('user_name')).toBe('user\\_name')
  })

  it('escapes both % and _', () => {
    expect(escapeLike('Zak_the_Bold%')).toBe('Zak\\_the\\_Bold\\%')
  })

  it('handles empty string', () => {
    expect(escapeLike('')).toBe('')
  })

  it('handles multiple wildcards', () => {
    expect(escapeLike('100% _ ok')).toBe('100\\% \\_ ok')
  })
})

describe('detectMimeFromBytes', () => {
  it('detects PNG from magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(detectMimeFromBytes(buf)).toBe('image/png')
  })

  it('detects JPEG from magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    expect(detectMimeFromBytes(buf)).toBe('image/jpeg')
  })

  it('detects WebP from magic bytes', () => {
    const buf = Buffer.alloc(12)
    buf.write('RIFF', 0, 'ascii')
    buf.writeUInt32LE(100, 4)
    buf.write('WEBP', 8, 'ascii')
    expect(detectMimeFromBytes(buf)).toBe('image/webp')
  })

  it('returns null for unrecognized content', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04])
    expect(detectMimeFromBytes(buf)).toBeNull()
  })

  it('returns null for empty buffer', () => {
    expect(detectMimeFromBytes(Buffer.alloc(0))).toBeNull()
  })

  it('returns null for too-short buffer', () => {
    expect(detectMimeFromBytes(Buffer.from([0x89, 0x50]))).toBeNull()
  })

  it('returns null for mismatched content (PNG header but only 3 bytes)', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e])
    expect(detectMimeFromBytes(buf)).toBeNull()
  })
})
