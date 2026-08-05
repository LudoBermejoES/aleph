import { describe, it, expect } from 'vitest'
import { normalizeNickname, isDuplicateNickname } from '../../../server/services/entity-nicknames'

describe('normalizeNickname', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeNickname('  Phillip  ')).toBe('Phillip')
  })

  it('reduces a whitespace-only string to empty', () => {
    expect(normalizeNickname('   ')).toBe('')
  })

  it('leaves internal whitespace untouched', () => {
    expect(normalizeNickname(' El hermético ')).toBe('El hermético')
  })

  it('returns an already-clean string unchanged', () => {
    expect(normalizeNickname('Phillip')).toBe('Phillip')
  })
})

describe('isDuplicateNickname', () => {
  it('detects an exact match', () => {
    expect(isDuplicateNickname('Phillip', ['Phillip', 'El hermético'])).toBe(true)
  })

  it('detects a case-insensitive match', () => {
    expect(isDuplicateNickname('phillip', ['Phillip'])).toBe(true)
    expect(isDuplicateNickname('PHILLIP', ['Phillip'])).toBe(true)
  })

  it('returns false when there is no match', () => {
    expect(isDuplicateNickname('Phillip', ['El hermético'])).toBe(false)
  })

  it('returns false against an empty list', () => {
    expect(isDuplicateNickname('Phillip', [])).toBe(false)
  })
})
