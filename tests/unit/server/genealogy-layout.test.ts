import { describe, it, expect } from 'vitest'
import {
  layoutTree,
  canonicalizeSymmetricPair,
  ROW_HEIGHT,
  NODE_WIDTH,
  NODE_H_GAP,
} from '../../../server/services/genealogy'

type RawNode = {
  entityId: string
  characterId: string
  name: string
  slug: string
  portraitUrl: null
  birthYear: number | null
  deathYear: number | null
  gender: string | null
  generation: number
}

function makeNode(entityId: string, generation: number, overrides: Partial<RawNode> = {}): RawNode {
  return {
    entityId,
    characterId: `char-${entityId}`,
    name: entityId,
    slug: entityId,
    portraitUrl: null,
    birthYear: null,
    deathYear: null,
    gender: null,
    generation,
    ...overrides,
  }
}

describe('layoutTree', () => {
  it('assigns y = generation * ROW_HEIGHT', () => {
    const nodes = new Map([
      ['parent', makeNode('parent', -1)],
      ['focus', makeNode('focus', 0)],
      ['child', makeNode('child', 1)],
    ])
    const result = layoutTree(nodes, [])
    const parent = result.find((n) => n.entityId === 'parent')!
    const focus = result.find((n) => n.entityId === 'focus')!
    const child = result.find((n) => n.entityId === 'child')!

    expect(parent.y).toBe(-1 * ROW_HEIGHT)
    expect(focus.y).toBe(0)
    expect(child.y).toBe(1 * ROW_HEIGHT)
  })

  it('places parent centered above single child', () => {
    const nodes = new Map([
      ['parent', makeNode('parent', -1)],
      ['focus', makeNode('focus', 0)],
    ])
    const result = layoutTree(nodes, [])
    expect(result.find((n) => n.entityId === 'parent')!.x).toBe(
      result.find((n) => n.entityId === 'focus')!.x,
    )
  })

  it('places spouse pair adjacent at same generation', () => {
    const nodes = new Map([
      ['alice', makeNode('alice', 0)],
      ['bob', makeNode('bob', 0)],
    ])
    const edges = [
      {
        id: 'e1',
        sourceEntityId: 'alice',
        targetEntityId: 'bob',
        type: 'spouse_of' as const,
        label: 'spouse of',
      },
    ]
    const result = layoutTree(nodes, edges)
    const alice = result.find((n) => n.entityId === 'alice')!
    const bob = result.find((n) => n.entityId === 'bob')!
    expect(Math.abs(alice.x - bob.x)).toBe(NODE_WIDTH + NODE_H_GAP)
    expect(alice.y).toBe(bob.y)
  })

  it('is deterministic across repeated calls', () => {
    const nodes = new Map([
      ['b', makeNode('b', 0, { birthYear: 1020 })],
      ['a', makeNode('a', 0, { birthYear: 1010 })],
      ['c', makeNode('c', 0, { birthYear: 1030 })],
    ])
    const result1 = layoutTree(nodes, [])
    const result2 = layoutTree(nodes, [])
    expect(result1.map((n) => n.entityId)).toEqual(result2.map((n) => n.entityId))
    expect(result1.map((n) => n.x)).toEqual(result2.map((n) => n.x))
  })

  it('sorts by birthYear asc within a generation (nulls last)', () => {
    const nodes = new Map([
      ['old', makeNode('old', 0, { birthYear: 900 })],
      ['young', makeNode('young', 0, { birthYear: 1000 })],
      ['unknown', makeNode('unknown', 0, { birthYear: null, slug: 'unknown' })],
    ])
    const result = layoutTree(nodes, [])
    const gen0 = result.filter((n) => n.generation === 0).sort((a, b) => a.x - b.x)
    expect(gen0[0].entityId).toBe('old')
    expect(gen0[1].entityId).toBe('young')
    expect(gen0[2].entityId).toBe('unknown')
  })

  it('assigns correct generation numbers', () => {
    const nodes = new Map([
      ['grandparent', makeNode('grandparent', -2)],
      ['parent', makeNode('parent', -1)],
      ['focus', makeNode('focus', 0)],
      ['child', makeNode('child', 1)],
    ])
    const result = layoutTree(nodes, [])
    const byEntity = Object.fromEntries(result.map((n) => [n.entityId, n]))
    expect(byEntity['grandparent'].generation).toBe(-2)
    expect(byEntity['parent'].generation).toBe(-1)
    expect(byEntity['focus'].generation).toBe(0)
    expect(byEntity['child'].generation).toBe(1)
  })
})

describe('canonicalizeSymmetricPair', () => {
  it('returns lower entityId as source', () => {
    expect(canonicalizeSymmetricPair('b', 'a')).toEqual(['a', 'b'])
    expect(canonicalizeSymmetricPair('a', 'b')).toEqual(['a', 'b'])
  })

  it('is consistent for same pair in either order', () => {
    const ab = canonicalizeSymmetricPair('alice', 'bob')
    const ba = canonicalizeSymmetricPair('bob', 'alice')
    expect(ab).toEqual(ba)
  })
})
