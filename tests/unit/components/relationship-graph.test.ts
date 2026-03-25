import { describe, it, expect } from 'vitest'
import { computeAttitudeColor } from '../../../server/services/relationships'
import { filterPinsByVisibility } from '../../../server/services/maps'

/**
 * Relationship graph component logic tests (9.13, 9.16, 9.17)
 */

// --- 9.13: Relation visibility filtering ---

describe('Relation visibility filtering (9.13)', () => {
  const relations = [
    { id: '1', sourceEntityId: 'a', targetEntityId: 'b', forwardLabel: 'allies', visibility: 'members', attitude: 50 },
    { id: '2', sourceEntityId: 'b', targetEntityId: 'c', forwardLabel: 'enemies', visibility: 'dm_only', attitude: -80 },
    { id: '3', sourceEntityId: 'a', targetEntityId: 'c', forwardLabel: 'neutral', visibility: 'public', attitude: 0 },
  ]

  it('DM sees all relations including dm_only', () => {
    const visible = filterPinsByVisibility(relations, 'dm')
    expect(visible).toHaveLength(3)
  })

  it('player sees members + public, not dm_only', () => {
    const visible = filterPinsByVisibility(relations, 'player')
    expect(visible).toHaveLength(2)
    expect(visible.map(r => r.id)).toContain('1')
    expect(visible.map(r => r.id)).toContain('3')
    expect(visible.map(r => r.id)).not.toContain('2')
  })

  it('visitor sees only public', () => {
    const visible = filterPinsByVisibility(relations, 'visitor')
    expect(visible).toHaveLength(1)
    expect(visible[0].id).toBe('3')
  })
})

// --- 9.16: Filter panel logic ---

describe('Filter panel logic (9.16)', () => {
  const nodes = {
    a: { name: 'Strahd', type: 'character' },
    b: { name: 'Barovia', type: 'location' },
    c: { name: 'Ireena', type: 'character' },
  }

  const edges = {
    e1: { source: 'a', target: 'b', label: 'rules', attitude: 80 },
    e2: { source: 'a', target: 'c', label: 'pursues', attitude: -40 },
  }

  function filterByNodeType(nodesObj: typeof nodes, edgesObj: typeof edges, type: string) {
    const filteredNodeIds = new Set(
      Object.entries(nodesObj).filter(([, n]) => n.type === type).map(([id]) => id),
    )
    const filteredEdges = Object.fromEntries(
      Object.entries(edgesObj).filter(([, e]) =>
        filteredNodeIds.has(e.source) || filteredNodeIds.has(e.target),
      ),
    )
    return { nodes: filteredNodeIds, edges: filteredEdges }
  }

  it('filter by character shows only character nodes and their edges', () => {
    const result = filterByNodeType(nodes, edges, 'character')
    expect(result.nodes.size).toBe(2)
    expect(result.nodes.has('a')).toBe(true)
    expect(result.nodes.has('c')).toBe(true)
    expect(Object.keys(result.edges)).toHaveLength(2) // both edges involve characters
  })

  it('filter by location shows location node and connected edges', () => {
    const result = filterByNodeType(nodes, edges, 'location')
    expect(result.nodes.size).toBe(1)
    expect(result.nodes.has('b')).toBe(true)
    expect(Object.keys(result.edges)).toHaveLength(1) // only e1 involves a location
  })
})

// --- 9.17: Attitude range slider logic ---

describe('Attitude range slider logic (9.17)', () => {
  const edges = [
    { id: 'e1', attitude: 80, label: 'allies' },
    { id: 'e2', attitude: -40, label: 'rivals' },
    { id: 'e3', attitude: 0, label: 'neutral' },
    { id: 'e4', attitude: -90, label: 'enemies' },
    { id: 'e5', attitude: 50, label: 'friends' },
  ]

  function filterByAttitudeRange(edgeList: typeof edges, min: number, max: number) {
    return edgeList.filter(e => e.attitude >= min && e.attitude <= max)
  }

  it('full range returns all edges', () => {
    expect(filterByAttitudeRange(edges, -100, 100)).toHaveLength(5)
  })

  it('positive only returns friendly edges', () => {
    const result = filterByAttitudeRange(edges, 1, 100)
    expect(result).toHaveLength(2)
    expect(result.map(e => e.label)).toEqual(['allies', 'friends'])
  })

  it('negative only returns hostile edges', () => {
    const result = filterByAttitudeRange(edges, -100, -1)
    expect(result).toHaveLength(2)
    expect(result.map(e => e.label)).toEqual(['rivals', 'enemies'])
  })

  it('narrow range filters precisely', () => {
    const result = filterByAttitudeRange(edges, -50, 50)
    expect(result).toHaveLength(3) // -40, 0, 50
  })

  it('attitude colors map correctly', () => {
    expect(computeAttitudeColor(100)).toMatch(/^#/) // green-ish
    expect(computeAttitudeColor(-100)).toMatch(/^#/) // red-ish
    expect(computeAttitudeColor(0)).toBe('#9ca3af') // gray
    expect(computeAttitudeColor(null)).toBe('#9ca3af') // gray
  })
})
