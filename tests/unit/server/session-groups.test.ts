import { describe, it, expect } from 'vitest'
import { slugify } from '../../../server/services/content'

describe('session group slug generation', () => {
  it('generates a slug from a simple name', () => {
    expect(slugify('La Familia')).toBe('la-familia')
  })

  it('handles special characters', () => {
    expect(slugify("The Dragon's Den!")).toMatch(/^the-dragon/)
  })

  it('handles all-lowercase input', () => {
    expect(slugify('genesis')).toBe('genesis')
  })

  it('produces non-empty slug for any non-empty name', () => {
    const result = slugify('Group 1')
    expect(result.length).toBeGreaterThan(0)
  })

  it('collapses multiple spaces', () => {
    const result = slugify('Group  Two')
    expect(result).toBe('group-two')
  })
})
