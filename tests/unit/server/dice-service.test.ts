import { describe, it, expect } from 'vitest'
import {
  parseDiceFormula,
  evaluateDiceRoll,
  formatRollResult,
  isValidFormula,
  type DiceExpression,
  type RollResult,
} from '../../../server/services/dice'

// --- Parser Tests (1a) ---

describe('parseDiceFormula', () => {
  it('parses "2d6+4" into roll(2,6) + constant(4)', () => {
    const ast = parseDiceFormula('2d6+4')
    expect(ast.type).toBe('add')
    expect(ast.left?.type).toBe('roll')
    expect(ast.left?.count).toBe(2)
    expect(ast.left?.sides).toBe(6)
    expect(ast.right?.type).toBe('constant')
    expect(ast.right?.value).toBe(4)
  })

  it('parses "4d6kh3" into roll(4,6) with keepHighest=3', () => {
    const ast = parseDiceFormula('4d6kh3')
    expect(ast.type).toBe('roll')
    expect(ast.count).toBe(4)
    expect(ast.sides).toBe(6)
    expect(ast.keepHighest).toBe(3)
  })

  it('parses "4d6kl1" into roll(4,6) with keepLowest=1', () => {
    const ast = parseDiceFormula('4d6kl1')
    expect(ast.type).toBe('roll')
    expect(ast.count).toBe(4)
    expect(ast.sides).toBe(6)
    expect(ast.keepLowest).toBe(1)
  })

  it('parses "2d10!" into roll(2,10) with exploding=true', () => {
    const ast = parseDiceFormula('2d10!')
    expect(ast.type).toBe('roll')
    expect(ast.count).toBe(2)
    expect(ast.sides).toBe(10)
    expect(ast.exploding).toBe(true)
  })

  it('parses "d%" as d100', () => {
    const ast = parseDiceFormula('d%')
    expect(ast.type).toBe('roll')
    expect(ast.count).toBe(1)
    expect(ast.sides).toBe(100)
  })

  it('parses "d20" as 1d20', () => {
    const ast = parseDiceFormula('d20')
    expect(ast.type).toBe('roll')
    expect(ast.count).toBe(1)
    expect(ast.sides).toBe(20)
  })

  it('parses "3d8-2" into roll(3,8) - constant(2)', () => {
    const ast = parseDiceFormula('3d8-2')
    expect(ast.type).toBe('subtract')
    expect(ast.left?.type).toBe('roll')
    expect(ast.right?.type).toBe('constant')
    expect(ast.right?.value).toBe(2)
  })

  it('throws on invalid input "2dd6"', () => {
    expect(() => parseDiceFormula('2dd6')).toThrow()
  })

  it('throws on invalid input "abc"', () => {
    expect(() => parseDiceFormula('abc')).toThrow()
  })

  it('throws on empty string', () => {
    expect(() => parseDiceFormula('')).toThrow()
  })
})

describe('isValidFormula', () => {
  it('returns true for valid formulas', () => {
    expect(isValidFormula('2d6+4')).toBe(true)
    expect(isValidFormula('d20')).toBe(true)
    expect(isValidFormula('4d6kh3')).toBe(true)
    expect(isValidFormula('d%')).toBe(true)
  })

  it('returns false for invalid formulas', () => {
    expect(isValidFormula('abc')).toBe(false)
    expect(isValidFormula('')).toBe(false)
    expect(isValidFormula('2dd6')).toBe(false)
  })
})

// --- Evaluator Tests (1b) ---

describe('evaluateDiceRoll', () => {
  // Mock RNG that returns predetermined values
  function mockRng(values: number[]) {
    let i = 0
    return (min: number, max: number) => {
      const v = values[i % values.length]
      i++
      return v
    }
  }

  it('2d6+4 with rolls [3,5] produces total 12', () => {
    const ast = parseDiceFormula('2d6+4')
    const result = evaluateDiceRoll(ast, mockRng([3, 5]))
    expect(result.total).toBe(12)
    expect(result.rolls).toHaveLength(1)
    expect(result.rolls[0].values).toEqual([3, 5])
  })

  it('4d6kh3 with rolls [1,4,3,6] keeps [4,3,6], total=13', () => {
    const ast = parseDiceFormula('4d6kh3')
    const result = evaluateDiceRoll(ast, mockRng([1, 4, 3, 6]))
    expect(result.total).toBe(13)
    expect(result.rolls[0].kept).toEqual([6, 4, 3])
    expect(result.rolls[0].dropped).toEqual([1])
  })

  it('4d6kl1 with rolls [1,4,3,6] keeps [1], total=1', () => {
    const ast = parseDiceFormula('4d6kl1')
    const result = evaluateDiceRoll(ast, mockRng([1, 4, 3, 6]))
    expect(result.total).toBe(1)
    expect(result.rolls[0].kept).toEqual([1])
  })

  it('exploding 2d6! with mock [6,6,3,2] produces extra rolls', () => {
    // First die: 6 (explodes) -> 3, second die: 6 (explodes) -> 2
    const ast = parseDiceFormula('2d6!')
    const result = evaluateDiceRoll(ast, mockRng([6, 6, 3, 2]))
    // Die 1: 6+3=9, Die 2: 6+2=8, total=17
    expect(result.total).toBe(17)
  })

  it('exploding dice respects 100-reroll cap', () => {
    // RNG always returns max (would loop forever without cap)
    const ast = parseDiceFormula('1d6!')
    const alwaysMax = (_min: number, max: number) => max
    const result = evaluateDiceRoll(ast, alwaysMax)
    // Should not hang, should have at most 100 explosion rolls
    expect(result.total).toBeGreaterThan(0)
    expect(result.rolls[0].values.length).toBeLessThanOrEqual(101)
  })

  it('d20 result is between 1 and 20', () => {
    const ast = parseDiceFormula('d20')
    for (let i = 0; i < 100; i++) {
      const result = evaluateDiceRoll(ast)
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeLessThanOrEqual(20)
    }
  })

  it('3d8-2 with rolls [4,5,3] produces total 10', () => {
    const ast = parseDiceFormula('3d8-2')
    const result = evaluateDiceRoll(ast, mockRng([4, 5, 3]))
    expect(result.total).toBe(10) // 4+5+3-2
  })

  it('RollResult has correct structure', () => {
    const ast = parseDiceFormula('2d6+4')
    const result = evaluateDiceRoll(ast, mockRng([3, 5]))
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('rolls')
    expect(result).toHaveProperty('formula')
    expect(result.formula).toBe('2d6+4')
    expect(result.rolls[0]).toHaveProperty('values')
    expect(Array.isArray(result.rolls[0].values)).toBe(true)
  })
})

// --- Format Tests ---

describe('formatRollResult', () => {
  it('formats a simple roll result', () => {
    const result: RollResult = {
      formula: '2d6+4',
      total: 12,
      rolls: [{ sides: 6, values: [3, 5], kept: [3, 5], dropped: [] }],
    }
    const formatted = formatRollResult(result)
    expect(formatted).toContain('12')
    expect(formatted).toContain('2d6+4')
  })
})
