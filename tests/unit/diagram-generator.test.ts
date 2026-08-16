import { describe, it, expect } from 'vitest'

import {
  generateEntityGraph,
  generateQuestTree,
  generateFactionWeb,
  generateSessionTimeline,
  generateDiagram,
  toTldrawSnapshot,
  filterSnapshotByVisibility,
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
    expect(() => generateEntityGraph(db, 'campaign-1', 'dm', 'user-1')).toThrow('No entities found')
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
        // 1st call: visibility check, 2nd: entities, rest: relations/memberships (empty)
        return callCount <= 2 ? entities : []
      },
      get: function () {
        return undefined
      },
    } as any

    const result = generateEntityGraph(db, 'campaign-1', 'dm', 'user-1')
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
        // 1st: visibility check, 2nd: entities, 3rd: relations, rest: empty
        // (org members, char-locations, org-locations)
        if (callCount === 1) return entities
        if (callCount === 2) return entities
        if (callCount === 3) return relations
        return []
      },
      get: function () {
        return undefined
      },
    } as any

    const result = generateEntityGraph(db, 'campaign-1', 'dm', 'user-1')
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
        return callCount <= 2 ? entities : []
      },
      get: function () {
        return undefined
      },
    } as any

    const result = generateEntityGraph(db, 'campaign-1', 'dm', 'user-1')
    for (const shape of result.shapes) {
      expect(typeof shape.x).toBe('number')
      expect(typeof shape.y).toBe('number')
    }
  })
})

describe('generateQuestTree', () => {
  it('throws when no quests found', () => {
    const db = mockDb({}) as any
    expect(() => generateQuestTree(db, 'campaign-1', 'dm', 'user-1')).toThrow('No quests found')
  })

  it('produces questNode shapes', () => {
    const questList = [
      { id: 'q1', name: 'Main Quest', slug: 'main', status: 'active', parentQuestId: null },
      { id: 'q2', name: 'Sub Quest', slug: 'sub', status: 'planned', parentQuestId: 'q1' },
    ]
    const db = mockDbWith(questList) as any
    const result = generateQuestTree(db, 'campaign-1', 'dm', 'user-1')
    expect(result.shapes.length).toBe(2)
    expect(result.shapes[0].type).toBe('questNode')
    expect(result.bindings.length).toBe(1)
  })
})

describe('generateFactionWeb', () => {
  it('throws when no organizations found', () => {
    const db = mockDb({}) as any
    expect(() => generateFactionWeb(db, 'campaign-1', 'dm', 'user-1')).toThrow(
      'No organizations found',
    )
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
        // 1st call: visibility check, 2nd: org list, rest: members/locations (empty)
        return callCount <= 2 ? orgs : []
      },
      get: function () {
        return undefined
      },
    } as any
    const result = generateFactionWeb(db, 'campaign-1', 'dm', 'user-1')
    // 2 org shapes, no members/locations since those queries return empty
    expect(result.shapes.length).toBe(2)
    // Both shapes should have distinct positions
    const samePosition =
      result.shapes[0].x === result.shapes[1].x && result.shapes[0].y === result.shapes[1].y
    expect(samePosition).toBe(false)
  })

  it('carries the location image through to the locationPin shape', () => {
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
    ]
    const locationRows = [
      { id: 'loc-1', name: 'The Keep', slug: 'the-keep', imageUrl: '/img/keep.png' },
    ]
    // Call order per org: 1st = orgs, 2nd = memberRows (empty), 3rd = locationRows
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
        // 1st: visibility check (must include every entity id used below, org and
        // location alike — a real query against `entities` would), 2nd: org list,
        // 3rd: memberRows (empty), 4th: locationRows
        if (callCount === 1) return [...orgs, ...locationRows]
        if (callCount === 2) return orgs
        if (callCount === 3) return []
        return locationRows
      },
      get: function () {
        return undefined
      },
    } as any
    const result = generateFactionWeb(db, 'campaign-1', 'dm', 'user-1')
    const locationShape = result.shapes.find((s: { type: string }) => s.type === 'locationPin') as
      | { props: Record<string, unknown> }
      | undefined
    expect(locationShape).toBeDefined()
    expect(locationShape!.props.locationImageUrl).toBe('/img/keep.png')
  })
})

describe('generateSessionTimeline', () => {
  it('throws when no sessions found', () => {
    const db = mockDb({}) as any
    expect(() => generateSessionTimeline(db, 'campaign-1', 'dm', 'user-1')).toThrow(
      'No sessions found',
    )
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
    const result = generateSessionTimeline(db, 'campaign-1', 'dm', 'user-1')
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
    expect(() => generateDiagram(db, 'c1', 'entity-graph', 'dm', 'user-1')).toThrow()
    expect(() => generateDiagram(db, 'c1', 'quest-tree', 'dm', 'user-1')).toThrow()
    expect(() => generateDiagram(db, 'c1', 'faction-web', 'dm', 'user-1')).toThrow()
    expect(() => generateDiagram(db, 'c1', 'session-timeline', 'dm', 'user-1')).toThrow()
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

describe('filterSnapshotByVisibility', () => {
  function buildSnapshot() {
    const generated = {
      shapes: [
        { id: 'e1', type: 'entityCard', x: 0, y: 0, props: { entityId: 'e1', entityName: 'A' } },
        { id: 'e2', type: 'entityCard', x: 100, y: 0, props: { entityId: 'e2', entityName: 'B' } },
      ],
      bindings: [{ id: 'r1', type: 'arrow' as const, fromId: 'e1', toId: 'e2', label: 'knows' }],
    }
    return toTldrawSnapshot(generated) as any
  }

  it('leaves the snapshot untouched when every entity is visible', () => {
    const snapshot = buildSnapshot()
    const filtered = filterSnapshotByVisibility(snapshot, new Set(['e1', 'e2']))
    expect(Object.keys(filtered.store)).toEqual(Object.keys(snapshot.store))
  })

  it('removes a hidden entity shape but keeps unrelated shapes', () => {
    const snapshot = buildSnapshot()
    const filtered = filterSnapshotByVisibility(snapshot, new Set(['e1']))
    expect(filtered.store['shape:e1']).toBeDefined()
    expect(filtered.store['shape:e2']).toBeUndefined()
  })

  it('removes the arrow and both its binding records when either endpoint is hidden', () => {
    const snapshot = buildSnapshot()
    const filtered = filterSnapshotByVisibility(snapshot, new Set(['e1']))
    expect(filtered.store['shape:r1']).toBeUndefined()
    expect(filtered.store['binding:r1-start']).toBeUndefined()
    expect(filtered.store['binding:r1-end']).toBeUndefined()
  })

  it('keeps the arrow when both endpoints remain visible', () => {
    const snapshot = buildSnapshot()
    const filtered = filterSnapshotByVisibility(snapshot, new Set(['e1', 'e2']))
    expect(filtered.store['shape:r1']).toBeDefined()
    expect(filtered.store['binding:r1-start']).toBeDefined()
    expect(filtered.store['binding:r1-end']).toBeDefined()
  })

  it('always keeps non-entity records (document, page)', () => {
    const snapshot = buildSnapshot()
    const filtered = filterSnapshotByVisibility(snapshot, new Set())
    expect(filtered.store['document:document']).toBeDefined()
    expect(filtered.store['page:page']).toBeDefined()
  })

  it('returns the snapshot unchanged instead of throwing when store is missing', () => {
    // Regression test: the save endpoint persists whatever JSON body the
    // client sends with no shape validation, so a stored snapshot isn't
    // guaranteed to have a `store` key. This previously threw
    // "Cannot convert undefined or null to object" from Object.entries(),
    // 500ing every load of the affected diagram (ALEPH-QG-M).
    const malformed = { schema: {} } as any
    expect(() => filterSnapshotByVisibility(malformed, new Set(['e1']))).not.toThrow()
    expect(filterSnapshotByVisibility(malformed, new Set(['e1']))).toBe(malformed)
  })

  it('returns the snapshot unchanged instead of throwing when store is null', () => {
    const malformed = { schema: {}, store: null } as any
    expect(() => filterSnapshotByVisibility(malformed, new Set(['e1']))).not.toThrow()
    expect(filterSnapshotByVisibility(malformed, new Set(['e1']))).toBe(malformed)
  })

  it('returns the snapshot unchanged instead of throwing when the snapshot itself is null', () => {
    const malformed = null as any
    expect(() => filterSnapshotByVisibility(malformed, new Set(['e1']))).not.toThrow()
    expect(filterSnapshotByVisibility(malformed, new Set(['e1']))).toBe(malformed)
  })
})
