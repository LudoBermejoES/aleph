import { describe, it, expect } from 'vitest'
import { sessionXpAwardsSchema } from '../../../server/utils/session-xp'

/**
 * Written from the RULE, not from the implementation. The rule is the requirement
 * "Award XP to characters for a session" in
 * `openspec/changes/add-per-character-session-xp/specs/session-participant-management/spec.md`:
 *
 *   body is `{ awards: [{ characterId: string, xp: number }] }`, every `xp` a non-negative
 *   integer, no `characterId` twice, and an empty array is legal (it clears the session).
 *
 * If one of these fails after a change, read the spec before touching the test.
 */
describe('sessionXpAwardsSchema', () => {
  it('accepts a list of awards', () => {
    expect(
      sessionXpAwardsSchema.safeParse({
        awards: [
          { characterId: 'otto', xp: 2 },
          { characterId: 'julia', xp: 3 },
        ],
      }).success,
    ).toBe(true)
  })

  it('accepts an award of zero — "recorded, awarded nothing" is a legal state', () => {
    expect(
      sessionXpAwardsSchema.safeParse({ awards: [{ characterId: 'otto', xp: 0 }] }).success,
    ).toBe(true)
  })

  it('accepts an empty array, which the spec defines as "clear every award"', () => {
    expect(sessionXpAwardsSchema.safeParse({ awards: [] }).success).toBe(true)
  })

  it('rejects a negative xp', () => {
    expect(
      sessionXpAwardsSchema.safeParse({ awards: [{ characterId: 'otto', xp: -1 }] }).success,
    ).toBe(false)
  })

  it('rejects a fractional xp', () => {
    expect(
      sessionXpAwardsSchema.safeParse({ awards: [{ characterId: 'otto', xp: 1.5 }] }).success,
    ).toBe(false)
  })

  it('rejects a stringified number — the wire type is a number, not "2"', () => {
    expect(
      sessionXpAwardsSchema.safeParse({ awards: [{ characterId: 'otto', xp: '2' }] }).success,
    ).toBe(false)
  })

  it('rejects the same characterId twice', () => {
    const result = sessionXpAwardsSchema.safeParse({
      awards: [
        { characterId: 'otto', xp: 2 },
        { characterId: 'otto', xp: 3 },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('names the duplicated characterId in the error, so a client can fix it', () => {
    const result = sessionXpAwardsSchema.safeParse({
      awards: [
        { characterId: 'otto', xp: 2 },
        { characterId: 'otto', xp: 3 },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain('otto')
    }
  })

  it('rejects an empty characterId rather than writing a row keyed on ""', () => {
    expect(sessionXpAwardsSchema.safeParse({ awards: [{ characterId: '', xp: 1 }] }).success).toBe(
      false,
    )
  })

  it('rejects a missing awards key — there is no silent no-op', () => {
    expect(sessionXpAwardsSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a missing xp', () => {
    expect(sessionXpAwardsSchema.safeParse({ awards: [{ characterId: 'otto' }] }).success).toBe(
      false,
    )
  })

  it('rejects a missing characterId', () => {
    expect(sessionXpAwardsSchema.safeParse({ awards: [{ xp: 2 }] }).success).toBe(false)
  })

  /**
   * The trap this repo has been bitten by: zod DISCARDS unknown keys, and discarding is
   * `success`. A client sending snake_case `character_id` would "validate" and write nothing.
   * Both halves are asserted: the snake_case body must FAIL, and a well-formed body must come
   * back deep-equal — nothing silently dropped, nothing silently added.
   */
  describe('a passing parse() must not have thrown anything away (task 2.6)', () => {
    it('parse(body) deep-equals body for a well-formed body', () => {
      const body = {
        awards: [
          { characterId: 'otto', xp: 2 },
          { characterId: 'julia', xp: 0 },
        ],
      }
      expect(sessionXpAwardsSchema.parse(body)).toEqual(body)
    })

    it('parse(body) deep-equals body for the empty-list body', () => {
      const body = { awards: [] }
      expect(sessionXpAwardsSchema.parse(body)).toEqual(body)
    })

    it('a snake_case character_id is refused, not silently dropped', () => {
      const result = sessionXpAwardsSchema.safeParse({ awards: [{ character_id: 'otto', xp: 2 }] })
      expect(result.success).toBe(false)
    })

    it('an unknown extra key is refused rather than accepted-and-discarded', () => {
      const result = sessionXpAwardsSchema.safeParse({
        awards: [{ characterId: 'otto', xp: 2, note: 'ignored?' }],
      })
      expect(result.success).toBe(false)
    })

    it('an unknown top-level key is refused too', () => {
      expect(sessionXpAwardsSchema.safeParse({ awards: [], merge: true }).success).toBe(false)
    })
  })
})
