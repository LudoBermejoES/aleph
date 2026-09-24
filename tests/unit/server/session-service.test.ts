import { describe, it, expect } from 'vitest'
import {
  nextSessionNumber,
  canTransitionQuestStatus,
  filterSecretQuests,
  filterRevealedConsequences,
} from '../../../server/services/sessions'

describe('nextSessionNumber', () => {
  it('returns 1 when no sessions exist', () => {
    expect(nextSessionNumber(0)).toBe(1)
  })

  it('returns max + 1', () => {
    expect(nextSessionNumber(5)).toBe(6)
  })

  it('returns max + 1 for large numbers', () => {
    expect(nextSessionNumber(99)).toBe(100)
  })
})

/**
 * Two assertions in this block were REVERSED by fix-quest-status-vocabulary, and the reason is
 * worth keeping next to them rather than only in a commit message.
 *
 * They read `completed -> active === false` and `unknown -> active === false`. Neither mirrored a
 * stated rule: nothing in the specs, the schema or any comment said that completing a quest was
 * final, or that a quest holding an unexpected status should be unchangeable. They mirrored the
 * transition table, and the table had simply never been thought about. That is this project's
 * most-repeated defect shape — a gate written from the implementation, which then pins whatever
 * the implementation happens to do.
 *
 * What the rules say now:
 *   - `completed -> active` is allowed, because reopening is what a Narrator needs when a thread
 *     comes back or the wrong row was clicked. Jumping from completed straight to failed is still
 *     refused: that is a contradiction, not a correction.
 *   - an UNRECOGNISED status can always reach `active`. The old `false` is what froze
 *     `el-anillo-de-bodas-robado-a-svetlana` in production: stored as `on_hold`, outside the
 *     table's domain, every exit refused, unrescuable without database access.
 *
 * The exhaustive cases live in `tests/unit/shared/quest-status.test.ts`, next to the rules; what
 * remains here is the re-export surface this module still owns.
 */
describe('canTransitionQuestStatus (re-exported from the shared vocabulary)', () => {
  it('lets an active quest be closed in each of the three ways', () => {
    expect(canTransitionQuestStatus('active', 'completed')).toBe(true)
    expect(canTransitionQuestStatus('active', 'failed')).toBe(true)
    expect(canTransitionQuestStatus('active', 'abandoned')).toBe(true)
  })

  it('lets a completed quest be reopened, but not redirected', () => {
    expect(canTransitionQuestStatus('completed', 'active')).toBe(true)
    expect(canTransitionQuestStatus('completed', 'failed')).toBe(false)
    expect(canTransitionQuestStatus('completed', 'abandoned')).toBe(false)
  })

  it('lets failed and abandoned quests be reopened', () => {
    expect(canTransitionQuestStatus('failed', 'active')).toBe(true)
    expect(canTransitionQuestStatus('abandoned', 'active')).toBe(true)
  })

  it('treats a status as no transition to itself', () => {
    expect(canTransitionQuestStatus('active', 'active')).toBe(false)
  })

  it('always lets an unrecognised status be rescued to active', () => {
    expect(canTransitionQuestStatus('on_hold', 'active')).toBe(true)
    expect(canTransitionQuestStatus('unknown', 'active')).toBe(true)
  })

  it('still refuses a target outside the vocabulary', () => {
    expect(canTransitionQuestStatus('active', 'on_hold')).toBe(false)
  })
})

describe('filterSecretQuests', () => {
  const quests = [
    { id: '1', name: 'Public Quest', isSecret: false },
    { id: '2', name: 'Secret Quest', isSecret: true },
    { id: '3', name: 'Another Public', isSecret: false },
  ]

  it('DM sees all quests', () => {
    expect(filterSecretQuests(quests, 'dm')).toHaveLength(3)
  })

  it('co_dm sees all quests', () => {
    expect(filterSecretQuests(quests, 'co_dm')).toHaveLength(3)
  })

  it('player sees only non-secret quests', () => {
    const result = filterSecretQuests(quests, 'player')
    expect(result).toHaveLength(2)
    expect(result.every((q) => !q.isSecret)).toBe(true)
  })

  it('editor sees only non-secret quests', () => {
    expect(filterSecretQuests(quests, 'editor')).toHaveLength(2)
  })

  it('returns empty for empty input', () => {
    expect(filterSecretQuests([], 'player')).toEqual([])
  })
})

describe('filterRevealedConsequences', () => {
  const consequences = [
    { id: '1', description: 'Revealed outcome', revealed: true },
    { id: '2', description: 'Hidden outcome', revealed: false },
  ]

  it('DM sees all consequences', () => {
    expect(filterRevealedConsequences(consequences, 'dm')).toHaveLength(2)
  })

  it('player sees only revealed consequences', () => {
    const result = filterRevealedConsequences(consequences, 'player')
    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('Revealed outcome')
  })
})
