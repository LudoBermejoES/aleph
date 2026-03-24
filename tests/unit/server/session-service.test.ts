import { describe, it, expect } from 'vitest'
import {
  nextSessionNumber,
  canTransitionQuestStatus,
  filterSecretQuests,
  filterRevealedConsequences,
  VALID_QUEST_TRANSITIONS,
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

describe('canTransitionQuestStatus', () => {
  it('active can transition to completed', () => {
    expect(canTransitionQuestStatus('active', 'completed')).toBe(true)
  })

  it('active can transition to failed', () => {
    expect(canTransitionQuestStatus('active', 'failed')).toBe(true)
  })

  it('active can transition to abandoned', () => {
    expect(canTransitionQuestStatus('active', 'abandoned')).toBe(true)
  })

  it('completed cannot transition to active', () => {
    expect(canTransitionQuestStatus('completed', 'active')).toBe(false)
  })

  it('completed cannot transition to anything', () => {
    expect(canTransitionQuestStatus('completed', 'failed')).toBe(false)
    expect(canTransitionQuestStatus('completed', 'abandoned')).toBe(false)
  })

  it('failed can transition back to active', () => {
    expect(canTransitionQuestStatus('failed', 'active')).toBe(true)
  })

  it('abandoned can transition back to active', () => {
    expect(canTransitionQuestStatus('abandoned', 'active')).toBe(true)
  })

  it('same status transition returns false', () => {
    expect(canTransitionQuestStatus('active', 'active')).toBe(false)
  })

  it('unknown status returns false', () => {
    expect(canTransitionQuestStatus('unknown', 'active')).toBe(false)
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
    expect(result.every(q => !q.isSecret)).toBe(true)
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
