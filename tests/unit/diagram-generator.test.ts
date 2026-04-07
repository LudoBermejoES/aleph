import { describe, it, expect } from 'vitest'

import {
  generateEntityGraph,
  generateQuestTree,
  generateFactionWeb,
  generateSessionTimeline,
  generateDiagram,
  toTldrawSnapshot,
} from '../../server/utils/diagram-generator'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock Drizzle-style db builder
function mockDb(data: Record<string, any[]>) {
  return {
    select: () => mockDb(data),
    from: (_table: any) => mockDb(data),
    where: () => mockDb(data),
    limit: () => mockDb(data),
    orderBy: () => mockDb(data),
    innerJoin: () => mockDb(data),
    leftJoin: () => mockDb(data),
    all: () => [] as any[],
    get: () => undefined,
  }
}

function mockDbWith(returnData: any[]) {
  return {
    select: () => mockDbWith(returnData),
    from: (_table: any) => mockDbWith(returnData),
    where: () => mockDbWith(returnData),
    limit: () => mockDbWith(returnData),
    orderBy: () => mockDbWith(returnData),
    innerJoin: () => mockDbWith(returnData),
    leftJoin: () => mockDbWith(returnData),
    all: () => returnData,
    get: () => returnData[0],
  }
}

describe('generateEntityGraph', () => {
  it('throws when no entities found', () => {
    const db = mockDb({}) as any
    expect(() => generateEntityGraph(db, 'campaign-1')).toThrow('No entities found')
  })

  it('produces entityCard shapes for each entity', () => {
    const entities = [
      { id: 'e1', name: 'Aria', type: 'character', slug: 'aria' },
      { id: 'e2', name: 'Elara', type: 'character', slug: 'elara' },
    ]

    // Create a db mock that returns entities on .all() but empty for relations
    let callCount = 0
    const db = {
      select: function () {
        return this
      },
      from: function () {
        return this
      },
      where: function () {
        return this
      },
      limit: function () {
        return this
      },
      orderBy: function () {
        return this
      },
      innerJoin: function () {
        return this
      },
      leftJoin: function () {
        return this
      },
      all: function () {
        callCount++
        // First call: entities, second call: relations
        return callCount === 1 ? entities : []
      },
      get: function () {
        return undefined
      },
    } as any

    const result = generateEntityGraph(db, 'campaign-1')
    expect(result.shapes).toHaveLength(2)
    expect(result.shapes[0].type).toBe('entityCard')
    expect(result.shapes[0].props.entityName).toBe('Aria')
    expect(result.shapes[1].props.entityName).toBe('Elara')
  })

  it('creates arrow bindings for relations between entities', () => {
    const entities = [
      { id: 'e1', name: 'Aria', type: 'character', slug: 'aria' },
      { id: 'e2', name: 'Elara', type: 'character', slug: 'elara' },
    ]
    const relations = [{ sourceEntityId: 'e1', targetEntityId: 'e2', forwardLabel: 'knows' }]

    let callCount = 0
    const db = {
      select: function () {
        return this
      },
      from: function () {
        return this
      },
      where: function () {
        return this
      },
      limit: function () {
        return this
      },
      orderBy: function () {
        return this
      },
      innerJoin: function () {
        return this
      },
      leftJoin: function () {
        return this
      },
      all: function () {
        callCount++
        // 1st: entities, 2nd: relations, rest: empty (org members, char-locations, org-locations)
        if (callCount === 1) return entities
        if (callCount === 2) return relations
        return []
      },
      get: function () {
        return undefined
      },
    } as any

    const result = generateEntityGraph(db, 'campaign-1')
    expect(result.bindings.length).toBeGreaterThanOrEqual(1)
    expect(result.bindings[0].type).toBe('arrow')
  })

  it('applies grid layout (each shape has x/y coords)', () => {
    const entities = [
      { id: 'e1', name: 'A', type: 'character', slug: 'a' },
      { id: 'e2', name: 'B', type: 'character', slug: 'b' },
      { id: 'e3', name: 'C', type: 'character', slug: 'c' },
    ]
    let callCount = 0
    const db = {
      select: function () {
        return this
      },
      from: function () {
        return this
      },
      where: function () {
        return this
      },
      limit: function () {
        return this
      },
      orderBy: function () {
        return this
      },
      innerJoin: function () {
        return this
      },
      leftJoin: function () {
        return this
      },
      all: function () {
        callCount++
        return callCount === 1 ? entities : []
      },
      get: function () {
        return undefined
      },
    } as any

    const result = generateEntityGraph(db, 'campaign-1')
    for (const shape of result.shapes) {
      expect(typeof shape.x).toBe('number')
      expect(typeof shape.y).toBe('number')
    }
  })
})

describe('generateQuestTree', () => {
  it('throws when no quests found', () => {
    const db = mockDb({}) as any
    expect(() => generateQuestTree(db, 'campaign-1')).toThrow('No quests found')
  })

  it('produces questNode shapes', () => {
    const questList = [
      { id: 'q1', name: 'Main Quest', slug: 'main', status: 'active', parentQuestId: null },
      { id: 'q2', name: 'Sub Quest', slug: 'sub', status: 'planned', parentQuestId: 'q1' },
    ]
    const db = mockDbWith(questList) as any
    const result = generateQuestTree(db, 'campaign-1')
    expect(result.shapes.length).toBe(2)
    expect(result.shapes[0].type).toBe('questNode')
    expect(result.bindings.length).toBe(1)
  })
})

describe('generateFactionWeb', () => {
  it('throws when no organizations found', () => {
    const db = mockDb({}) as any
    expect(() => generateFactionWeb(db, 'campaign-1')).toThrow('No organizations found')
  })

  it('uses radial layout for organizations', () => {
    const orgs = [
      {
        id: 'o1',
        name: 'Order of the Shield',
        slug: 'order',
        type: 'faction',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'o2',
        name: 'Dark Guild',
        slug: 'dark-guild',
        type: 'guild',
        status: 'secret',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    // First .all() returns orgs, subsequent calls (members, locations per org) return empty
    let callCount = 0
    const db = {
      select: function () {
        return this
      },
      from: function () {
        return this
      },
      where: function () {
        return this
      },
      limit: function () {
        return this
      },
      orderBy: function () {
        return this
      },
      innerJoin: function () {
        return this
      },
      leftJoin: function () {
        return this
      },
      all: function () {
        callCount++
        return callCount === 1 ? orgs : []
      },
      get: function () {
        return undefined
      },
    } as any
    const result = generateFactionWeb(db, 'campaign-1')
    // 2 org shapes, no members/locations since those queries return empty
    expect(result.shapes.length).toBe(2)
    // Both shapes should have distinct positions
    const samePosition =
      result.shapes[0].x === result.shapes[1].x && result.shapes[0].y === result.shapes[1].y
    expect(samePosition).toBe(false)
  })
})

describe('generateSessionTimeline', () => {
  it('throws when no sessions found', () => {
    const db = mockDb({}) as any
    expect(() => generateSessionTimeline(db, 'campaign-1')).toThrow('No sessions found')
  })

  it('lays out sessions left-to-right and connects with arrows', () => {
    const sessions = [
      {
        id: 's1',
        title: 'Session 1',
        slug: 'session-1',
        sessionNumber: 1,
        campaignId: 'c1',
        status: 'completed',
        scheduledDate: null,
        summary: null,
        arcId: null,
        chapterId: null,
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 's2',
        title: 'Session 2',
        slug: 'session-2',
        sessionNumber: 2,
        campaignId: 'c1',
        status: 'completed',
        scheduledDate: null,
        summary: null,
        arcId: null,
        chapterId: null,
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 's3',
        title: 'Session 3',
        slug: 'session-3',
        sessionNumber: 3,
        campaignId: 'c1',
        status: 'planned',
        scheduledDate: null,
        summary: null,
        arcId: null,
        chapterId: null,
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    const db = mockDbWith(sessions) as any
    const result = generateSessionTimeline(db, 'campaign-1')
    expect(result.shapes.length).toBe(3)
    expect(result.bindings.length).toBe(2)
    // Increasing x coords
    expect(result.shapes[0].x).toBeLessThan(result.shapes[1].x)
    expect(result.shapes[1].x).toBeLessThan(result.shapes[2].x)
  })
})

describe('generateDiagram', () => {
  it('dispatches to the correct generator', () => {
    const db = mockDb({}) as any
    expect(() => generateDiagram(db, 'c1', 'entity-graph')).toThrow()
    expect(() => generateDiagram(db, 'c1', 'quest-tree')).toThrow()
    expect(() => generateDiagram(db, 'c1', 'faction-web')).toThrow()
    expect(() => generateDiagram(db, 'c1', 'session-timeline')).toThrow()
  })
})

describe('toTldrawSnapshot', () => {
  it('returns object with schema and store', () => {
    const generated = {
      shapes: [{ id: 'shape1', type: 'entityCard', x: 0, y: 0, props: { entityName: 'Test' } }],
      bindings: [],
    }
    const snapshot = toTldrawSnapshot(generated) as any
    expect(snapshot).toHaveProperty('schema')
    expect(snapshot).toHaveProperty('store')
    expect(snapshot.store['shape:shape1']).toBeDefined()
    expect(snapshot.store['page:page']).toBeDefined()
  })
})
