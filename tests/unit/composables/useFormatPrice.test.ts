import { describe, it, expect } from 'vitest'
import { formatPrice } from '../../../app/composables/useFormatPrice'

const currencies = [
  { id: 'c1', name: 'Gold', symbol: 'gp' },
  { id: 'c2', name: 'Silver', symbol: 'sp' },
  { id: 'c3', name: 'Copper', symbol: 'cp' },
  { id: 'c4', name: 'Electrum', symbol: null },
]

describe('formatPrice', () => {
  it('formats single currency by id', () => {
    expect(formatPrice('{"c1":50}', currencies)).toBe('50 gp')
  })

  it('formats multiple currencies', () => {
    expect(formatPrice('{"c1":2,"c2":10}', currencies)).toBe('2 gp, 10 sp')
  })

  it('matches currency by name (case-insensitive)', () => {
    expect(formatPrice('{"gold":5}', currencies)).toBe('5 gp')
    expect(formatPrice('{"SILVER":3}', currencies)).toBe('3 sp')
  })

  it('falls back to raw key when currency not found', () => {
    expect(formatPrice('{"platinum":1}', currencies)).toBe('1 platinum')
  })

  it('returns empty string for null', () => {
    expect(formatPrice(null, currencies)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatPrice(undefined, currencies)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatPrice('', currencies)).toBe('')
  })

  it('returns raw string for malformed JSON', () => {
    expect(formatPrice('not-json', currencies)).toBe('not-json')
  })

  it('skips zero-amount entries', () => {
    expect(formatPrice('{"c1":0,"c2":5}', currencies)).toBe('5 sp')
  })

  it('uses currency name when symbol is null', () => {
    expect(formatPrice('{"c4":3}', currencies)).toBe('3 Electrum')
  })

  it('handles empty price object', () => {
    expect(formatPrice('{}', currencies)).toBe('')
  })

  it('works with empty currencies array (falls back to raw keys)', () => {
    expect(formatPrice('{"gold":10}', [])).toBe('10 gold')
  })
})
