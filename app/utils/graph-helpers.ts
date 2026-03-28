/**
 * Graph helper utilities for the campaign relationship graph.
 * Used by EntityGraphView.client.vue and graph.vue.
 */
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceCenter,
} from 'd3-force'

// ─── Degree & Neighbor Utilities ─────────────────────────────────────────────

/** Compute connection degree for each node ID from the edge map. */
export function computeDegreeMap(
  edges: Record<string, { source: string; target: string }>,
): Record<string, number> {
  const degree: Record<string, number> = {}
  for (const edge of Object.values(edges)) {
    degree[edge.source] = (degree[edge.source] ?? 0) + 1
    degree[edge.target] = (degree[edge.target] ?? 0) + 1
  }
  return degree
}

/** Return the set of node IDs directly connected to a given node. */
export function computeNeighborSet(
  nodeId: string,
  edges: Record<string, { source: string; target: string }>,
): Set<string> {
  const neighbors = new Set<string>()
  for (const edge of Object.values(edges)) {
    if (edge.source === nodeId) neighbors.add(edge.target)
    else if (edge.target === nodeId) neighbors.add(edge.source)
  }
  return neighbors
}

/**
 * Return the set of neighbor node IDs AND connected edge IDs for a node.
 * Used to compute the active highlight set for focus+context interaction.
 */
export function computeActiveHighlightSet(
  nodeId: string | null,
  edges: Record<string, { source: string; target: string }>,
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  if (!nodeId) return { nodeIds: new Set(), edgeIds: new Set() }
  const nodeIds = new Set<string>([nodeId])
  const edgeIds = new Set<string>()
  for (const [edgeId, edge] of Object.entries(edges)) {
    if (edge.source === nodeId) {
      nodeIds.add(edge.target)
      edgeIds.add(edgeId)
    } else if (edge.target === nodeId) {
      nodeIds.add(edge.source)
      edgeIds.add(edgeId)
    }
  }
  return { nodeIds, edgeIds }
}

// ─── Node Radius ──────────────────────────────────────────────────────────────

/** Compute visual radius for a node based on its connection degree.
 * Formula: 14 + 3 * sqrt(degree). Minimum: 14px. */
export function computeNodeRadius(degree: number): number {
  return 14 + 3 * Math.sqrt(Math.max(0, degree))
}

// ─── Opacity Helpers ──────────────────────────────────────────────────────────

/**
 * Compute the opacity for a node given the current highlight state.
 * - focusedNodeId active: highlighted nodes → 1.0, others → 0.1
 * - hoveredNodeId active (no focus): highlighted nodes → 1.0, others → 0.3
 * - no active state: 1.0
 */
export function nodeOpacity(
  nodeId: string,
  highlightSet: { nodeIds: Set<string>; edgeIds: Set<string> },
  mode: 'focus' | 'hover' | null,
): number {
  if (!mode) return 1.0
  if (highlightSet.nodeIds.has(nodeId)) return 1.0
  return mode === 'focus' ? 0.1 : 0.3
}

/**
 * Compute the edge label fontSize callback result.
 * Returns 10 for edges connected to the active node, 0 otherwise.
 */
export function edgeLabelFontSize(
  edgeId: string,
  highlightSet: { nodeIds: Set<string>; edgeIds: Set<string> },
  mode: 'focus' | 'hover' | null,
): number {
  if (!mode) return 0
  return highlightSet.edgeIds.has(edgeId) ? 10 : 0
}

// ─── Relation Type Color Palette ─────────────────────────────────────────────

export const RELATION_TYPE_COLORS: Record<string, string> = {
  ally: '#22c55e',
  allied_with: '#22c55e',
  enemy: '#ef4444',
  at_war_with: '#ef4444',
  rival: '#f97316',
  mentor: '#f59e0b',
  'family:spouse': '#ec4899',
  family: '#3b82f6',
  custom: '#9ca3af',
}

/**
 * Map a relation type slug to its display color.
 * Falls back to gray for unknown slugs.
 */
export function relationTypeColor(slug: string): string {
  if (!slug) return RELATION_TYPE_COLORS.custom!
  // Exact match first
  const exact = RELATION_TYPE_COLORS[slug]
  if (exact) return exact
  // Prefix match for family:* (e.g. family:sibling, family:parent)
  if (slug.startsWith('family:')) return RELATION_TYPE_COLORS.family!
  return RELATION_TYPE_COLORS.custom!
}

// ─── Custom Force Simulation ─────────────────────────────────────────────────

export interface SimNode {
  id: string
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
  organizations?: Array<{ slug: string; name: string }>
}

export interface SimLink {
  id: string
  source: string
  target: string
}

/**
 * Create a tuned d3-force simulation for the campaign-wide graph.
 * Parameters are optimized for 20-100 nodes.
 *
 * @param nodes  Array of SimNode objects (must have `id`)
 * @param links  Array of SimLink objects (source/target are node IDs)
 * @param degreeMap  Pre-computed degree map for collision radii
 */
export function createGraphSimulation(
  nodes: SimNode[],
  links: SimLink[],
  degreeMap: Record<string, number>,
) {
  const linkForce = forceLink<SimNode, SimLink>(links)
    .id((d: SimNode) => d.id)
    .distance(100)
    .iterations(2)

  const sim = forceSimulation<SimNode>(nodes)
    .force('charge', forceManyBody<SimNode>().strength(-200).distanceMax(400))
    .force('link', linkForce)
    .force('collide', forceCollide<SimNode>().radius((d: SimNode) => computeNodeRadius(degreeMap[d.id] ?? 0) + 8).iterations(2))
    .force('center', forceCenter(0, 0).strength(0.05))
    .alphaDecay(0.015)

  // Cluster force: nudge nodes toward their organization centroid each tick
  sim.on('tick.cluster', () => {
    // Compute centroids per org slug
    const centroids: Record<string, { x: number; y: number; count: number }> = {}
    for (const node of nodes) {
      for (const org of node.organizations ?? []) {
        const c = centroids[org.slug] ?? { x: 0, y: 0, count: 0 }
        c.x += node.x ?? 0
        c.y += node.y ?? 0
        c.count++
        centroids[org.slug] = c
      }
    }
    for (const c of Object.values(centroids)) {
      if (c.count > 0) { c.x /= c.count; c.y /= c.count }
    }

    const strength = 0.04
    for (const node of nodes) {
      if (node.fx != null) continue // skip pinned nodes
      for (const org of node.organizations ?? []) {
        const c = centroids[org.slug]
        if (!c) continue
        node.vx = (node.vx ?? 0) + (c.x - (node.x ?? 0)) * strength
        node.vy = (node.vy ?? 0) + (c.y - (node.y ?? 0)) * strength
      }
    }
  })

  return sim
}
