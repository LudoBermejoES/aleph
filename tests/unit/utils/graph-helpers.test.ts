import { describe, it, expect } from 'vitest'
import {
  computeDegreeMap,
  computeNeighborSet,
  computeNodeRadius,
  computeActiveHighlightSet,
  nodeOpacity,
  edgeLabelFontSize,
  relationTypeColor,
  RELATION_TYPE_COLORS,
} from '../../../app/utils/graph-helpers'

// ─── computeDegreeMap ─────────────────────────────────────────────────────────

describe('computeDegreeMap', () => {
  it('returns empty object for empty edges', () => {
    expect(computeDegreeMap({})).toEqual({})
  })

  it('counts degree for each node', () => {
    const edges = {
      e1: { source: 'a', target: 'b' },
      e2: { source: 'a', target: 'c' },
      e3: { source: 'b', target: 'c' },
    }
    const dm = computeDegreeMap(edges)
    expect(dm['a']).toBe(2)
    expect(dm['b']).toBe(2)
    expect(dm['c']).toBe(2)
  })

  it('degree is symmetric (source and target both counted)', () => {
    const edges = { e1: { source: 'x', target: 'y' } }
    const dm = computeDegreeMap(edges)
    expect(dm['x']).toBe(1)
    expect(dm['y']).toBe(1)
  })

  it('isolated nodes not in any edge have no entry', () => {
    const edges = { e1: { source: 'a', target: 'b' } }
    const dm = computeDegreeMap(edges)
    expect(dm['z']).toBeUndefined()
  })

  it('accumulates multiple edges for the same node', () => {
    const edges = {
      e1: { source: 'hub', target: 'n1' },
      e2: { source: 'hub', target: 'n2' },
      e3: { source: 'hub', target: 'n3' },
      e4: { source: 'hub', target: 'n4' },
    }
    expect(computeDegreeMap(edges)['hub']).toBe(4)
  })
})

// ─── computeNeighborSet ───────────────────────────────────────────────────────

describe('computeNeighborSet', () => {
  const edges = {
    e1: { source: 'a', target: 'b' },
    e2: { source: 'a', target: 'c' },
    e3: { source: 'd', target: 'e' },
  }

  it('returns direct neighbors only', () => {
    const neighbors = computeNeighborSet('a', edges)
    expect(neighbors.has('b')).toBe(true)
    expect(neighbors.has('c')).toBe(true)
    expect(neighbors.size).toBe(2)
  })

  it('excludes the node itself', () => {
    expect(computeNeighborSet('a', edges).has('a')).toBe(false)
  })

  it('returns neighbors from both directions', () => {
    const neighbors = computeNeighborSet('b', edges)
    expect(neighbors.has('a')).toBe(true)
    expect(neighbors.size).toBe(1)
  })

  it('returns empty set for isolated node', () => {
    expect(computeNeighborSet('z', edges).size).toBe(0)
  })

  it('returns empty set for empty edges', () => {
    expect(computeNeighborSet('a', {}).size).toBe(0)
  })
})

// ─── computeNodeRadius ────────────────────────────────────────────────────────

describe('computeNodeRadius', () => {
  it('degree 0 → 14 (minimum)', () => {
    expect(computeNodeRadius(0)).toBe(14)
  })

  it('degree 1 → ~17', () => {
    expect(computeNodeRadius(1)).toBeCloseTo(14 + 3 * Math.sqrt(1), 5)
  })

  it('degree 9 → ~23', () => {
    expect(computeNodeRadius(9)).toBeCloseTo(14 + 3 * Math.sqrt(9), 5) // = 14 + 9 = 23
  })

  it('degree 15 → ~25.6', () => {
    expect(computeNodeRadius(15)).toBeCloseTo(14 + 3 * Math.sqrt(15), 5)
  })

  it('negative degree is treated as 0', () => {
    expect(computeNodeRadius(-5)).toBe(14)
  })
})

// ─── computeActiveHighlightSet ────────────────────────────────────────────────

describe('computeActiveHighlightSet', () => {
  const edges = {
    e1: { source: 'a', target: 'b' },
    e2: { source: 'a', target: 'c' },
    e3: { source: 'd', target: 'e' },
  }

  it('returns empty sets when nodeId is null', () => {
    const { nodeIds, edgeIds } = computeActiveHighlightSet(null, edges)
    expect(nodeIds.size).toBe(0)
    expect(edgeIds.size).toBe(0)
  })

  it('includes the focused node itself', () => {
    const { nodeIds } = computeActiveHighlightSet('a', edges)
    expect(nodeIds.has('a')).toBe(true)
  })

  it('includes neighbor node IDs', () => {
    const { nodeIds } = computeActiveHighlightSet('a', edges)
    expect(nodeIds.has('b')).toBe(true)
    expect(nodeIds.has('c')).toBe(true)
  })

  it('includes connected edge IDs', () => {
    const { edgeIds } = computeActiveHighlightSet('a', edges)
    expect(edgeIds.has('e1')).toBe(true)
    expect(edgeIds.has('e2')).toBe(true)
  })

  it('excludes unconnected nodes and edges', () => {
    const { nodeIds, edgeIds } = computeActiveHighlightSet('a', edges)
    expect(nodeIds.has('d')).toBe(false)
    expect(nodeIds.has('e')).toBe(false)
    expect(edgeIds.has('e3')).toBe(false)
  })

  it('returns empty sets for isolated node', () => {
    const { nodeIds, edgeIds } = computeActiveHighlightSet('z', edges)
    expect(nodeIds.has('z')).toBe(true) // node itself is included
    expect(edgeIds.size).toBe(0)
  })
})

// ─── nodeOpacity ─────────────────────────────────────────────────────────────

describe('nodeOpacity', () => {
  const highlightSet = {
    nodeIds: new Set(['a', 'b']),
    edgeIds: new Set(['e1']),
  }

  it('returns 1.0 when no mode is active', () => {
    expect(nodeOpacity('a', highlightSet, null)).toBe(1.0)
    expect(nodeOpacity('z', highlightSet, null)).toBe(1.0)
  })

  it('highlighted node returns 1.0 in focus mode', () => {
    expect(nodeOpacity('a', highlightSet, 'focus')).toBe(1.0)
  })

  it('dimmed node returns 0.1 in focus mode', () => {
    expect(nodeOpacity('z', highlightSet, 'focus')).toBe(0.1)
  })

  it('highlighted node returns 1.0 in hover mode', () => {
    expect(nodeOpacity('b', highlightSet, 'hover')).toBe(1.0)
  })

  it('dimmed node returns 0.3 in hover mode', () => {
    expect(nodeOpacity('z', highlightSet, 'hover')).toBe(0.3)
  })
})

// ─── edgeLabelFontSize ────────────────────────────────────────────────────────

describe('edgeLabelFontSize', () => {
  const highlightSet = {
    nodeIds: new Set(['a', 'b']),
    edgeIds: new Set(['e1', 'e2']),
  }

  it('returns 0 when no mode is active', () => {
    expect(edgeLabelFontSize('e1', highlightSet, null)).toBe(0)
  })

  it('connected edge returns 10 in focus mode', () => {
    expect(edgeLabelFontSize('e1', highlightSet, 'focus')).toBe(10)
  })

  it('non-connected edge returns 0 in focus mode', () => {
    expect(edgeLabelFontSize('e9', highlightSet, 'focus')).toBe(0)
  })

  it('connected edge returns 10 in hover mode', () => {
    expect(edgeLabelFontSize('e2', highlightSet, 'hover')).toBe(10)
  })

  it('non-connected edge returns 0 in hover mode', () => {
    expect(edgeLabelFontSize('e9', highlightSet, 'hover')).toBe(0)
  })
})

// ─── relationTypeColor ────────────────────────────────────────────────────────

describe('relationTypeColor', () => {
  it('ally → green #22c55e', () => {
    expect(relationTypeColor('ally')).toBe('#22c55e')
  })

  it('allied_with → green #22c55e', () => {
    expect(relationTypeColor('allied_with')).toBe('#22c55e')
  })

  it('enemy → red #ef4444', () => {
    expect(relationTypeColor('enemy')).toBe('#ef4444')
  })

  it('at_war_with → red #ef4444', () => {
    expect(relationTypeColor('at_war_with')).toBe('#ef4444')
  })

  it('rival → orange #f97316', () => {
    expect(relationTypeColor('rival')).toBe('#f97316')
  })

  it('mentor → amber #f59e0b', () => {
    expect(relationTypeColor('mentor')).toBe('#f59e0b')
  })

  it('family:spouse → pink #ec4899', () => {
    expect(relationTypeColor('family:spouse')).toBe('#ec4899')
  })

  it('family:sibling → blue #3b82f6 (family:* prefix)', () => {
    expect(relationTypeColor('family:sibling')).toBe('#3b82f6')
  })

  it('family:parent → blue #3b82f6 (family:* prefix)', () => {
    expect(relationTypeColor('family:parent')).toBe('#3b82f6')
  })

  it('unknown slug → gray #9ca3af', () => {
    expect(relationTypeColor('something_unknown')).toBe('#9ca3af')
  })

  it('empty string → gray #9ca3af', () => {
    expect(relationTypeColor('')).toBe('#9ca3af')
  })

  it('custom → gray #9ca3af', () => {
    expect(relationTypeColor('custom')).toBe('#9ca3af')
  })

  it('RELATION_TYPE_COLORS has expected keys', () => {
    expect(RELATION_TYPE_COLORS).toHaveProperty('ally')
    expect(RELATION_TYPE_COLORS).toHaveProperty('enemy')
    expect(RELATION_TYPE_COLORS).toHaveProperty('rival')
    expect(RELATION_TYPE_COLORS).toHaveProperty('mentor')
    expect(RELATION_TYPE_COLORS).toHaveProperty('family:spouse')
    expect(RELATION_TYPE_COLORS).toHaveProperty('custom')
  })
})
