import { describe, it, expect } from 'vitest'
import { QUEST_SHORT_DESCRIPTION_MAX_LENGTH } from '../../../shared/utils/quest-short-description'

describe('QUEST_SHORT_DESCRIPTION_MAX_LENGTH', () => {
  it('is the agreed cap', () => {
    expect(QUEST_SHORT_DESCRIPTION_MAX_LENGTH).toBe(200)
  })

  /**
   * Not decoration: the list renders the short description without a `line-clamp`, so the only
   * thing keeping a card from growing without bound is this number being small. A cap large enough
   * to need clamping would quietly void the whole point of the field.
   */
  it('is small enough that an uncapped card cannot run away', () => {
    expect(QUEST_SHORT_DESCRIPTION_MAX_LENGTH).toBeLessThanOrEqual(280)
    expect(QUEST_SHORT_DESCRIPTION_MAX_LENGTH).toBeGreaterThan(80)
  })
})
