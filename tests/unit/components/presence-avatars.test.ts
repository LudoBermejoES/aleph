import { describe, it, expect } from 'vitest'

// Test the pure logic from PresenceAvatars component
// (initials computation, color generation, overflow calculation)

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function userColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 45%)`
}

describe('PresenceAvatars — initials', () => {
  it('extracts first letters of two words', () => {
    expect(initials('Strahd von Zarovich')).toBe('SV')
  })

  it('single word gives one letter', () => {
    expect(initials('Alice')).toBe('A')
  })

  it('handles empty string', () => {
    expect(initials('')).toBe('')
  })

  it('limits to two initials max', () => {
    expect(initials('John James Doe Smith')).toBe('JJ')
  })
})

describe('PresenceAvatars — userColor', () => {
  it('produces deterministic color for same userId', () => {
    const c1 = userColor('user-123')
    const c2 = userColor('user-123')
    expect(c1).toBe(c2)
  })

  it('produces different colors for different userIds', () => {
    const c1 = userColor('user-123')
    const c2 = userColor('user-456')
    expect(c1).not.toBe(c2)
  })

  it('returns valid HSL color string', () => {
    const color = userColor('test-user')
    expect(color).toMatch(/^hsl\(\d+, 65%, 45%\)$/)
  })
})

describe('PresenceAvatars — overflow calculation', () => {
  it('no overflow when users <= maxVisible', () => {
    const users = [{ userId: '1', name: 'A', role: 'dm' }]
    const maxVisible = 5
    const overflow = Math.max(0, users.length - maxVisible)
    expect(overflow).toBe(0)
  })

  it('shows overflow when users > maxVisible', () => {
    const users = Array.from({ length: 8 }, (_, i) => ({
      userId: `u${i}`, name: `User ${i}`, role: 'player',
    }))
    const maxVisible = 5
    const overflow = Math.max(0, users.length - maxVisible)
    expect(overflow).toBe(3)
    expect(users.slice(0, maxVisible)).toHaveLength(5)
  })
})
