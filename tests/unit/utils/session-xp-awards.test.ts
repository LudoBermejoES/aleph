import { describe, it, expect } from 'vitest'
import {
  buildXpRows,
  hasInvalidXp,
  parseXpInput,
  rosterCharacterIds,
  toAwardsBody,
} from '../../../app/utils/session-xp-awards'

/**
 * These assertions are written from the RULES in
 * `openspec/changes/add-per-character-session-xp/specs/session-participant-management/spec.md`
 * (requirement "Choose which characters receive XP in the UI", plus the replace semantics of the
 * `PUT`), NOT from what the implementation happens to do. If one of them fails after a change,
 * read the rule before touching the test.
 */

describe('rosterCharacterIds', () => {
  it("names every character of the session's attendance roster, in roster order", () => {
    expect(
      rosterCharacterIds([{ characterId: 'a' }, { characterId: 'b' }, { characterId: 'c' }]),
    ).toEqual(['a', 'b', 'c'])
  })

  it('skips attendance rows that carry no characterId', () => {
    // Live shape: 2 of the 6 rows of the 2026-08-24 session have none.
    const attendance = [
      { characterId: 'a' },
      { characterId: null },
      { characterId: 'b' },
      {},
      { characterId: '   ' },
      { characterId: 'c' },
    ]
    expect(rosterCharacterIds(attendance)).toEqual(['a', 'b', 'c'])
  })

  it('lists a character once even if it appears on two attendance rows', () => {
    expect(rosterCharacterIds([{ characterId: 'a' }, { characterId: 'a' }])).toEqual(['a'])
  })

  it('is empty for an empty roster rather than throwing', () => {
    expect(rosterCharacterIds([])).toEqual([])
    expect(rosterCharacterIds()).toEqual([])
  })
})

describe('buildXpRows — what the panel offers when it opens', () => {
  it('offers the three characters named by a three-character roster', () => {
    const rows = buildXpRows([{ characterId: 'a' }, { characterId: 'b' }, { characterId: 'c' }], [])
    expect(rows.map((r) => r.characterId)).toEqual(['a', 'b', 'c'])
  })

  it('leaves a character with no saved award blank, not zero', () => {
    // Blank means "nothing recorded"; 0 means "recorded, awarded nothing". Never the same.
    expect(buildXpRows([{ characterId: 'a' }], [])).toEqual([{ characterId: 'a', xp: '' }])
  })

  it('seeds a saved award, including an award of zero', () => {
    const rows = buildXpRows(
      [{ characterId: 'a' }, { characterId: 'b' }],
      [
        { characterId: 'a', xp: 2 },
        { characterId: 'b', xp: 0 },
      ],
    )
    expect(rows).toEqual([
      { characterId: 'a', xp: '2' },
      { characterId: 'b', xp: '0' },
    ])
  })

  it('keeps an awarded character that is absent from the roster', () => {
    // A character may be awarded without attending. If the panel dropped it, the next save —
    // which REPLACES the whole set — would silently delete an award nobody meant to touch.
    const rows = buildXpRows([{ characterId: 'a' }], [{ characterId: 'off-screen', xp: 3 }])
    expect(rows).toEqual([
      { characterId: 'a', xp: '' },
      { characterId: 'off-screen', xp: '3' },
    ])
  })

  it('renders no row for an attendance row with no character', () => {
    expect(buildXpRows([{ characterId: null }, { characterId: 'a' }], [])).toEqual([
      { characterId: 'a', xp: '' },
    ])
  })
})

describe('parseXpInput — the values the server would accept', () => {
  it('reads a non-negative integer as a value', () => {
    expect(parseXpInput('2')).toEqual({ kind: 'value', xp: 2 })
    expect(parseXpInput('0')).toEqual({ kind: 'value', xp: 0 })
  })

  it('reads an empty input as blank, which is not zero', () => {
    expect(parseXpInput('')).toEqual({ kind: 'blank' })
    expect(parseXpInput('   ')).toEqual({ kind: 'blank' })
    expect(parseXpInput('')).not.toEqual(parseXpInput('0'))
  })

  it('refuses the values the endpoint answers 422 to', () => {
    expect(parseXpInput('-1')).toEqual({ kind: 'invalid' })
    expect(parseXpInput('1.5')).toEqual({ kind: 'invalid' })
    expect(parseXpInput('dos')).toEqual({ kind: 'invalid' })
  })
})

describe('toAwardsBody — the body of the single PUT', () => {
  it('carries exactly what was typed for each character', () => {
    expect(
      toAwardsBody([
        { characterId: 'otto', xp: '2' },
        { characterId: 'julia', xp: '3' },
      ]),
    ).toEqual([
      { characterId: 'otto', xp: 2 },
      { characterId: 'julia', xp: 3 },
    ])
  })

  it('sends a typed 0 as an award of 0', () => {
    expect(toAwardsBody([{ characterId: 'otto', xp: '0' }])).toEqual([
      { characterId: 'otto', xp: 0 },
    ])
  })

  it('omits a blank row: nothing recorded for that character', () => {
    expect(
      toAwardsBody([
        { characterId: 'otto', xp: '2' },
        { characterId: 'julia', xp: '' },
      ]),
    ).toEqual([{ characterId: 'otto', xp: 2 }])
  })

  it('omits a character whose row was removed, which is how an award is cleared', () => {
    const rows = [
      { characterId: 'otto', xp: '2' },
      { characterId: 'julia', xp: '3' },
    ]
    const afterRemovingJulia = rows.filter((r) => r.characterId !== 'julia')
    expect(toAwardsBody(afterRemovingJulia)).toEqual([{ characterId: 'otto', xp: 2 }])
    // The endpoint replaces the whole set, so julia's absence here IS the deletion.
    expect(toAwardsBody(afterRemovingJulia).some((a) => a.characterId === 'julia')).toBe(false)
  })

  it('sends an empty list when every row is gone, clearing the session', () => {
    expect(toAwardsBody([])).toEqual([])
  })

  it('never sends a value the endpoint would refuse', () => {
    expect(toAwardsBody([{ characterId: 'otto', xp: '-1' }])).toEqual([])
    expect(toAwardsBody([{ characterId: 'otto', xp: '1.5' }])).toEqual([])
  })

  it('never repeats a characterId, which the endpoint answers 422 to', () => {
    expect(
      toAwardsBody([
        { characterId: 'otto', xp: '2' },
        { characterId: 'otto', xp: '5' },
      ]),
    ).toEqual([{ characterId: 'otto', xp: 2 }])
  })
})

describe('hasInvalidXp — what blocks the save', () => {
  it('is false when every row is blank or a valid value', () => {
    expect(
      hasInvalidXp([
        { characterId: 'a', xp: '' },
        { characterId: 'b', xp: '0' },
        { characterId: 'c', xp: '7' },
      ]),
    ).toBe(false)
  })

  it('is true as soon as one row holds a negative or fractional value', () => {
    expect(
      hasInvalidXp([
        { characterId: 'a', xp: '2' },
        { characterId: 'b', xp: '-1' },
      ]),
    ).toBe(true)
    expect(hasInvalidXp([{ characterId: 'a', xp: '1.5' }])).toBe(true)
  })
})
