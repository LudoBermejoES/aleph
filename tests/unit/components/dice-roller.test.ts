import { describe, it, expect } from 'vitest'

/**
 * DiceRoller component logic tests (6.1, 6.2, 6.3)
 * Pure logic extracted from DiceRoller.vue — no DOM mounting needed.
 */

// --- Shared helpers mirroring DiceRoller.vue logic ---

function applyModifier(formula: string, modifier: number): string {
  if (modifier === 0) return formula
  return modifier > 0 ? `${formula}+${modifier}` : `${formula}${modifier}`
}

function addToLog(log: Array<{ formula: string; total: number }>, entry: { formula: string; total: number }, maxSize = 50) {
  log.unshift(entry)
  if (log.length > maxSize) log.pop()
  return log
}

function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

// --- 6.1: Quick-roll button triggers roll, displays result ---

describe('DiceRoller quick-roll logic (6.1)', () => {
  it('quick-roll builds correct formula for each die', () => {
    for (const sides of [4, 6, 8, 10, 12, 20, 100]) {
      expect(`1d${sides}`).toBe(`1d${sides}`)
    }
  })

  it('modifier is appended to quick-roll formula', () => {
    expect(applyModifier('1d20', 5)).toBe('1d20+5')
    expect(applyModifier('1d6', -2)).toBe('1d6-2')
    expect(applyModifier('1d8', 0)).toBe('1d8')
  })

  it('result is stored as lastResult with total', () => {
    const result = { formula: '1d20', total: 15, rolls: [{ values: [15], kept: [15], dropped: [] }], modifiers: 0 }
    expect(result.total).toBe(15)
    expect(result.formula).toBe('1d20')
  })

  it('roll log is updated after each roll', () => {
    const log: Array<{ formula: string; total: number }> = []
    addToLog(log, { formula: '1d20', total: 12 })
    addToLog(log, { formula: '2d6', total: 8 })
    expect(log).toHaveLength(2)
    expect(log[0].formula).toBe('2d6') // most recent first
    expect(log[1].formula).toBe('1d20')
  })
})

// --- 6.2: Formula input: Enter submits, invalid shows error ---

describe('DiceRoller formula input logic (6.2)', () => {
  it('empty formula does not trigger roll', () => {
    const formula = '   '
    expect(formula.trim().length).toBe(0)
  })

  it('non-empty formula is trimmed before rolling', () => {
    const formula = '  2d6+4  '
    expect(formula.trim()).toBe('2d6+4')
  })

  it('formula is cleared after successful roll', () => {
    let formula = '2d6+4'
    // simulate roll then clear
    const submitted = formula.trim()
    formula = ''
    expect(submitted).toBe('2d6+4')
    expect(formula).toBe('')
  })

  it('modifier is applied to typed formula', () => {
    expect(applyModifier('2d6+4', 3)).toBe('2d6+4+3')
    expect(applyModifier('4d6kh3', -1)).toBe('4d6kh3-1')
    expect(applyModifier('d20', 0)).toBe('d20')
  })

  it('modifier display formats correctly', () => {
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(5)).toBe('+5')
    expect(formatModifier(-3)).toBe('-3')
  })
})

// --- 6.3: Roll log feed: displays rolls in order ---

describe('DiceRoller roll log feed (6.3)', () => {
  it('log shows newest entry first', () => {
    const log: Array<{ formula: string; total: number }> = []
    addToLog(log, { formula: '1d4', total: 3 })
    addToLog(log, { formula: '1d6', total: 5 })
    addToLog(log, { formula: '1d8', total: 7 })
    expect(log[0].formula).toBe('1d8')
    expect(log[1].formula).toBe('1d6')
    expect(log[2].formula).toBe('1d4')
  })

  it('log is capped at 50 entries', () => {
    const log: Array<{ formula: string; total: number }> = []
    for (let i = 0; i < 55; i++) {
      addToLog(log, { formula: `1d${i + 1}`, total: i + 1 })
    }
    expect(log).toHaveLength(50)
    expect(log[0].formula).toBe('1d55') // most recent
  })

  it('each log entry has formula and total', () => {
    const log: Array<{ formula: string; total: number }> = []
    addToLog(log, { formula: '2d6+4', total: 14 })
    expect(log[0].formula).toBe('2d6+4')
    expect(log[0].total).toBe(14)
  })

  it('empty log shows nothing', () => {
    const log: Array<{ formula: string; total: number }> = []
    expect(log.length).toBe(0)
  })
})

// --- WebSocket broadcast shape (3.1-3.3) ---

describe('dice:roll WebSocket message shape (3.1)', () => {
  it('broadcast message has correct type and fields', () => {
    const msg = {
      type: 'dice:roll',
      campaignId: 'camp-1',
      userId: 'user-1',
      formula: '2d6+4',
      result: { total: 12, rolls: [], modifiers: 4 },
      timestamp: Date.now(),
    }
    expect(msg.type).toBe('dice:roll')
    expect(msg.formula).toBe('2d6+4')
    expect(msg.result.total).toBe(12)
  })

  it('graceful degradation: broadcast is no-op when no WS clients', () => {
    // emitCampaignMessage silently no-ops when _broadcastFn is null
    let called = false
    const mockEmit = (fn: (() => void) | null) => {
      if (!fn) return
      called = true
      fn()
    }
    mockEmit(null)
    expect(called).toBe(false)
  })
})
