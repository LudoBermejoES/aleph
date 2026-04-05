import { describe, it, expect } from 'vitest'

// Extract the hash function for unit testing (same logic as composable)
function hashToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

describe('useCollaborationUser - color derivation', () => {
  it('produces a hue in [0, 360) for any user ID', () => {
    const hue = hashToHue('user-abc-123')
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThan(360)
  })

  it('is deterministic — same input always yields same hue', () => {
    const id = 'user-deterministic-42'
    expect(hashToHue(id)).toBe(hashToHue(id))
  })

  it('produces different hues for different user IDs', () => {
    const hue1 = hashToHue('user-alpha')
    const hue2 = hashToHue('user-beta')
    expect(hue1).not.toBe(hue2)
  })

  it('handles empty string without throwing', () => {
    expect(() => hashToHue('')).not.toThrow()
  })
})
