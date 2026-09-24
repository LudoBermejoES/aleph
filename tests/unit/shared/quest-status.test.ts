import { describe, it, expect } from 'vitest'
import {
  QUEST_STATUSES,
  QUEST_STATUS_TRANSITIONS,
  canTransitionQuestStatus,
  isQuestStatus,
} from '../../../shared/utils/quest-status'

describe('QUEST_STATUSES', () => {
  it('is the one vocabulary every layer reads', () => {
    expect([...QUEST_STATUSES]).toEqual(['active', 'completed', 'failed', 'abandoned'])
  })

  it('does not contain on_hold, the word that only ever lived in two zod enums', () => {
    expect(QUEST_STATUSES as readonly string[]).not.toContain('on_hold')
  })

  it('declares a transition list for every status, so none can fall outside the map', () => {
    for (const s of QUEST_STATUSES) {
      expect(QUEST_STATUS_TRANSITIONS[s], `no transitions declared for ${s}`).toBeDefined()
    }
    expect(Object.keys(QUEST_STATUS_TRANSITIONS).sort()).toEqual([...QUEST_STATUSES].sort())
  })

  it('recognises its own members and nothing else', () => {
    for (const s of QUEST_STATUSES) expect(isQuestStatus(s)).toBe(true)
    expect(isQuestStatus('on_hold')).toBe(false)
    expect(isQuestStatus('')).toBe(false)
  })
})

describe('canTransitionQuestStatus', () => {
  it('lets an active quest be closed in each of the three ways', () => {
    expect(canTransitionQuestStatus('active', 'completed')).toBe(true)
    expect(canTransitionQuestStatus('active', 'failed')).toBe(true)
    expect(canTransitionQuestStatus('active', 'abandoned')).toBe(true)
  })

  it('lets every closed status be reopened', () => {
    expect(canTransitionQuestStatus('completed', 'active')).toBe(true)
    expect(canTransitionQuestStatus('failed', 'active')).toBe(true)
    expect(canTransitionQuestStatus('abandoned', 'active')).toBe(true)
  })

  /**
   * Reopening a completed quest is a correction; declaring a completed quest failed is a
   * contradiction. Reopen first, then fail. Same for abandoned.
   */
  it('refuses a jump from one closed status straight to another', () => {
    expect(canTransitionQuestStatus('completed', 'failed')).toBe(false)
    expect(canTransitionQuestStatus('completed', 'abandoned')).toBe(false)
    expect(canTransitionQuestStatus('failed', 'abandoned')).toBe(false)
    expect(canTransitionQuestStatus('abandoned', 'failed')).toBe(false)
  })

  it('treats a status as no transition to itself', () => {
    for (const s of QUEST_STATUSES) expect(canTransitionQuestStatus(s, s)).toBe(false)
  })

  /**
   * The generalisation of the incident: a quest stored as `on_hold` fell outside the map, every
   * target was refused, and it was frozen in production with no route out. A stray value must stay
   * rescuable.
   */
  it('always lets an unrecognised status be reopened to active', () => {
    expect(canTransitionQuestStatus('on_hold', 'active')).toBe(true)
    expect(canTransitionQuestStatus('whatever-a-restore-left-behind', 'active')).toBe(true)
  })

  it('does not let an unrecognised status go anywhere else', () => {
    expect(canTransitionQuestStatus('on_hold', 'completed')).toBe(false)
    expect(canTransitionQuestStatus('on_hold', 'failed')).toBe(false)
  })

  it('never accepts a target outside the vocabulary', () => {
    expect(canTransitionQuestStatus('active', 'on_hold')).toBe(false)
    expect(canTransitionQuestStatus('on_hold', 'on_hold')).toBe(false)
  })
})
