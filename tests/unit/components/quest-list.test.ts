import { describe, it, expect } from 'vitest'

/**
 * Test quest list component with nesting logic (8.27)
 *
 * The quest list page uses rootQuests (no parentQuestId) and
 * childQuests(parentId) to render a nested quest tree.
 */

interface Quest {
  id: string
  name: string
  status: string
  parentQuestId: string | null
}

function rootQuests(quests: Quest[]): Quest[] {
  return quests.filter(q => !q.parentQuestId)
}

function childQuests(quests: Quest[], parentId: string): Quest[] {
  return quests.filter(q => q.parentQuestId === parentId)
}

const sampleQuests: Quest[] = [
  { id: '1', name: 'Main Quest: Defeat Strahd', status: 'active', parentQuestId: null },
  { id: '2', name: 'Find the Sunsword', status: 'active', parentQuestId: '1' },
  { id: '3', name: 'Find the Holy Symbol', status: 'completed', parentQuestId: '1' },
  { id: '4', name: 'Side Quest: Help Ireena', status: 'active', parentQuestId: null },
  { id: '5', name: 'Escort to Vallaki', status: 'active', parentQuestId: '4' },
  { id: '6', name: 'Talk to Ismark', status: 'completed', parentQuestId: '4' },
]

describe('Quest list nesting logic (8.27)', () => {
  it('rootQuests returns only quests without parentQuestId', () => {
    const roots = rootQuests(sampleQuests)
    expect(roots).toHaveLength(2)
    expect(roots.map(q => q.name)).toEqual([
      'Main Quest: Defeat Strahd',
      'Side Quest: Help Ireena',
    ])
  })

  it('childQuests returns children of a specific parent', () => {
    const children = childQuests(sampleQuests, '1')
    expect(children).toHaveLength(2)
    expect(children.map(q => q.name)).toEqual([
      'Find the Sunsword',
      'Find the Holy Symbol',
    ])
  })

  it('childQuests returns empty for quest with no children', () => {
    const children = childQuests(sampleQuests, '2')
    expect(children).toHaveLength(0)
  })

  it('childQuests returns empty for non-existent parent', () => {
    const children = childQuests(sampleQuests, 'nonexistent')
    expect(children).toHaveLength(0)
  })

  it('rootQuests returns all quests when none have parents', () => {
    const flat: Quest[] = [
      { id: '1', name: 'Q1', status: 'active', parentQuestId: null },
      { id: '2', name: 'Q2', status: 'active', parentQuestId: null },
    ]
    expect(rootQuests(flat)).toHaveLength(2)
  })

  it('empty quest list returns empty roots', () => {
    expect(rootQuests([])).toHaveLength(0)
  })

  it('nested structure: root → children → no grandchildren in flat list', () => {
    const roots = rootQuests(sampleQuests)
    for (const root of roots) {
      const children = childQuests(sampleQuests, root.id)
      expect(children.length).toBeGreaterThan(0)
      for (const child of children) {
        // No grandchildren in this sample
        expect(childQuests(sampleQuests, child.id)).toHaveLength(0)
      }
    }
  })
})
