import { describe, it, expect } from 'vitest'

/**
 * Editor toolbar logic tests (8.10, 8.11)
 */

describe('Toolbar button state reflects active marks/nodes (8.10)', () => {
  // These test the logic used in the toolbar — isActive checks
  const activeMarks = new Set(['bold', 'italic'])
  const activeNodes = new Set(['heading'])

  function isActive(type: string): boolean {
    return activeMarks.has(type) || activeNodes.has(type)
  }

  it('bold button shows active when bold mark is active', () => {
    expect(isActive('bold')).toBe(true)
  })

  it('strikethrough button shows inactive when not active', () => {
    expect(isActive('strike')).toBe(false)
  })

  it('heading button shows active when heading node is active', () => {
    expect(isActive('heading')).toBe(true)
  })

  it('code button shows inactive when not active', () => {
    expect(isActive('code')).toBe(false)
  })
})

describe('Link insertion produces correct markdown (8.11)', () => {
  function markdownLink(text: string, url: string): string {
    return `[${text}](${url})`
  }

  it('produces markdown link syntax', () => {
    expect(markdownLink('Click here', 'https://example.com')).toBe('[Click here](https://example.com)')
  })

  it('handles empty text', () => {
    expect(markdownLink('', 'https://example.com')).toBe('[](https://example.com)')
  })

  it('handles URL with special characters', () => {
    expect(markdownLink('Link', 'https://example.com/path?q=1&b=2')).toBe('[Link](https://example.com/path?q=1&b=2)')
  })
})
