import { describe, it, expect } from 'vitest'
import {
  validateCurrencyAmount,
  calculateTotalPrice,
  canTransferItem,
  processTransaction,
} from '../../../server/services/inventory'

describe('validateCurrencyAmount', () => {
  it('accepts valid positive amounts', () => {
    expect(validateCurrencyAmount({ gold: 10, silver: 5 })).toEqual({ valid: true })
  })

  it('rejects negative amounts', () => {
    const result = validateCurrencyAmount({ gold: -1 })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('negative')
  })

  it('accepts zero amounts', () => {
    expect(validateCurrencyAmount({ gold: 0 })).toEqual({ valid: true })
  })

  it('rejects non-numeric values', () => {
    const result = validateCurrencyAmount({ gold: 'abc' as any })
    expect(result.valid).toBe(false)
  })

  it('accepts empty object', () => {
    expect(validateCurrencyAmount({})).toEqual({ valid: true })
  })
})

describe('calculateTotalPrice', () => {
  const currencies = [
    { id: 'gold', name: 'Gold', valueInBase: 100 },
    { id: 'silver', name: 'Silver', valueInBase: 10 },
    { id: 'copper', name: 'Copper', valueInBase: 1 },
  ]

  it('converts 150 copper to 1 gold 5 silver 0 copper', () => {
    const result = calculateTotalPrice(150, currencies)
    expect(result.gold).toBe(1)
    expect(result.silver).toBe(5)
    expect(result.copper).toBe(0)
  })

  it('converts 0 base to all zeros', () => {
    const result = calculateTotalPrice(0, currencies)
    expect(result.gold).toBe(0)
    expect(result.silver).toBe(0)
    expect(result.copper).toBe(0)
  })

  it('converts 99 base correctly', () => {
    const result = calculateTotalPrice(99, currencies)
    expect(result.gold).toBe(0)
    expect(result.silver).toBe(9)
    expect(result.copper).toBe(9)
  })

  it('sums wealth from amounts object to base value', () => {
    const total = calculateTotalPrice.toBase({ gold: 2, silver: 3, copper: 15 }, currencies)
    expect(total).toBe(2 * 100 + 3 * 10 + 15)
  })
})

describe('canTransferItem', () => {
  it('returns true when quantity is sufficient', () => {
    const result = canTransferItem({ currentQuantity: 10, transferQuantity: 5 })
    expect(result.allowed).toBe(true)
  })

  it('returns false when quantity is insufficient', () => {
    const result = canTransferItem({ currentQuantity: 3, transferQuantity: 5 })
    expect(result.allowed).toBe(false)
    expect(result.error?.toLowerCase()).toContain('insufficient')
  })

  it('returns true for exact quantity', () => {
    const result = canTransferItem({ currentQuantity: 5, transferQuantity: 5 })
    expect(result.allowed).toBe(true)
  })

  it('rejects zero transfer', () => {
    const result = canTransferItem({ currentQuantity: 5, transferQuantity: 0 })
    expect(result.allowed).toBe(false)
  })

  it('rejects negative transfer', () => {
    const result = canTransferItem({ currentQuantity: 5, transferQuantity: -1 })
    expect(result.allowed).toBe(false)
  })
})

describe('processTransaction', () => {
  it('produces correct transaction record for purchase', () => {
    const tx = processTransaction({
      type: 'purchase',
      fromId: 'player-1',
      toId: 'shop-1',
      itemId: 'sword-1',
      quantity: 1,
      amounts: { gold: 50 },
    })
    expect(tx.type).toBe('purchase')
    expect(tx.fromId).toBe('player-1')
    expect(tx.toId).toBe('shop-1')
    expect(tx.itemId).toBe('sword-1')
    expect(tx.quantity).toBe(1)
    expect(tx.amounts).toEqual({ gold: 50 })
    expect(tx.timestamp).toBeDefined()
  })

  it('produces correct record for loot', () => {
    const tx = processTransaction({
      type: 'loot',
      fromId: null,
      toId: 'player-1',
      itemId: 'gem-1',
      quantity: 3,
      amounts: {},
    })
    expect(tx.type).toBe('loot')
    expect(tx.fromId).toBeNull()
  })
})
