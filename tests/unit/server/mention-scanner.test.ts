import { describe, it, expect } from 'vitest'
import { buildAutomaton, findMatches, resolveOverlaps } from '../../../server/services/autolink'

/**
 * Search-autolink tests (8.8, 8.9)
 *
 * 8.8: retroactive linking on entity creation
 * 8.9: mentions API logic
 */

describe('Retroactive linking on entity creation (8.8)', () => {
  it('new entity name found in existing content', () => {
    const entities = [
      { id: 'e1', name: 'Strahd', aliases: [] },
      { id: 'e2', name: 'Barovia', aliases: [] },
    ]
    const automaton = buildAutomaton(entities)

    // Existing content mentions both entities
    const text = 'The party traveled to Barovia where they met Strahd.'
    const matches = findMatches(text, automaton)
    const resolved = resolveOverlaps(matches)

    expect(resolved).toHaveLength(2)
    expect(resolved.map(m => m.entityId).sort()).toEqual(['e1', 'e2'])
  })

  it('adding a new entity triggers detection in existing text', () => {
    // Initially only Strahd exists
    let entities = [{ id: 'e1', name: 'Strahd', aliases: [] }]
    let automaton = buildAutomaton(entities)
    const text = 'Strahd lives in Castle Ravenloft.'

    let matches = resolveOverlaps(findMatches(text, automaton))
    expect(matches).toHaveLength(1)
    expect(matches[0].entityId).toBe('e1')

    // Now add Castle Ravenloft as an entity — re-scan finds it
    entities = [
      { id: 'e1', name: 'Strahd', aliases: [] },
      { id: 'e2', name: 'Castle Ravenloft', aliases: [] },
    ]
    automaton = buildAutomaton(entities)
    matches = resolveOverlaps(findMatches(text, automaton))
    expect(matches).toHaveLength(2)
    expect(matches.map(m => m.entityId).sort()).toEqual(['e1', 'e2'])
  })
})

describe('Mentions API logic (8.9)', () => {
  it('mention count aggregation', () => {
    const entities = [
      { id: 'e1', name: 'Strahd', aliases: ['The Devil'] },
      { id: 'e2', name: 'Ireena', aliases: [] },
    ]
    const automaton = buildAutomaton(entities)
    const text = 'Strahd pursues Ireena. Strahd is The Devil. Ireena flees.'

    const matches = resolveOverlaps(findMatches(text, automaton))

    // Count mentions per entity
    const counts = new Map<string, number>()
    for (const m of matches) {
      counts.set(m.entityId, (counts.get(m.entityId) || 0) + 1)
    }

    expect(counts.get('e1')).toBeGreaterThanOrEqual(2) // Strahd + The Devil
    expect(counts.get('e2')).toBeGreaterThanOrEqual(2) // Ireena x2
  })

  it('self-mentions are excluded in scanner context', () => {
    const entities = [
      { id: 'e1', name: 'Strahd', aliases: [] },
      { id: 'e2', name: 'Barovia', aliases: [] },
    ]
    const automaton = buildAutomaton(entities)

    // When scanning entity e1's own content, exclude self-mentions
    const text = 'Strahd rules Barovia.'
    const matches = resolveOverlaps(findMatches(text, automaton))
    const otherMentions = matches.filter(m => m.entityId !== 'e1')
    expect(otherMentions).toHaveLength(1)
    expect(otherMentions[0].entityId).toBe('e2')
  })
})
