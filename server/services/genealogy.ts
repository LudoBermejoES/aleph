import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq, and, or, inArray } from 'drizzle-orm'
import { entityRelations, relationTypes } from '../db/schema/relations'
import { characters } from '../db/schema/characters'
import { entities } from '../db/schema/entities'

// --- Constants ---

export const FAMILY_SLUGS = ['parent_of', 'spouse_of', 'sibling_of'] as const
export const ROW_HEIGHT = 160
export const NODE_WIDTH = 120
export const NODE_H_GAP = 32
const MAX_DEPTH = 10
const MAX_CYCLE_HOPS = 200

// --- Types ---

export interface GenealogyNode {
  entityId: string
  characterId: string
  name: string
  slug: string
  portraitUrl: string | null
  birthYear: number | null
  deathYear: number | null
  gender: string | null
  generation: number
  x: number
  y: number
}

export interface GenealogyEdge {
  id: string
  sourceEntityId: string
  targetEntityId: string
  type: 'parent_of' | 'spouse_of' | 'sibling_of'
  label: string
}

export interface GenealogyTree {
  focus: GenealogyNode
  nodes: GenealogyNode[]
  edges: GenealogyEdge[]
  warnings: string[]
}

// --- Helpers ---

/**
 * Canonicalize a symmetric pair so the lower entityId is always source.
 * Used for spouse_of and sibling_of to ensure single-row storage.
 */
export function canonicalizeSymmetricPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

function getFamilyRelationTypeIds(
  db: BetterSQLite3Database,
  campaignId: string,
): Record<string, string> {
  const rows = db
    .select({ id: relationTypes.id, slug: relationTypes.slug })
    .from(relationTypes)
    .where(
      and(eq(relationTypes.campaignId, campaignId), inArray(relationTypes.slug, [...FAMILY_SLUGS])),
    )
    .all()
  return Object.fromEntries(rows.map((r) => [r.slug, r.id]))
}

// --- Cycle Detection ---

/**
 * Detect if adding a parent_of edge (parentEntityId → childEntityId) would create a cycle.
 * Returns true if a cycle would be created.
 * Traverses UP from parentEntityId looking for childEntityId.
 */
export async function detectCycle(
  parentEntityId: string,
  childEntityId: string,
  db: BetterSQLite3Database,
  campaignId: string,
): Promise<boolean> {
  if (parentEntityId === childEntityId) return true

  const typeIds = getFamilyRelationTypeIds(db, campaignId)
  const parentOfId = typeIds['parent_of']
  if (!parentOfId) return false

  // BFS up from parentEntityId — if we find childEntityId, it's an ancestor → cycle
  const visited = new Set<string>()
  const queue = [parentEntityId]
  let hops = 0

  while (queue.length > 0 && hops < MAX_CYCLE_HOPS) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    hops++

    // current is a child — find its parents (source of parent_of pointing TO current)
    const parentRows = db
      .select({ sourceEntityId: entityRelations.sourceEntityId })
      .from(entityRelations)
      .where(
        and(
          eq(entityRelations.relationTypeId, parentOfId),
          eq(entityRelations.targetEntityId, current),
        ),
      )
      .all()

    for (const row of parentRows) {
      if (row.sourceEntityId === childEntityId) return true
      if (!visited.has(row.sourceEntityId)) queue.push(row.sourceEntityId)
    }
  }

  return false
}

// --- Year Coherence Validation ---

export interface YearWarning {
  type: 'parent_younger_than_child' | 'parent_died_before_child_birth'
  message: string
}

export function validateYearCoherence(
  parent: { birthYear: number | null; deathYear: number | null },
  child: { birthYear: number | null },
): YearWarning[] {
  const warnings: YearWarning[] = []

  if (parent.birthYear !== null && child.birthYear !== null) {
    if (parent.birthYear >= child.birthYear) {
      warnings.push({
        type: 'parent_younger_than_child',
        message: `Parent birth year (${parent.birthYear}) ≥ child birth year (${child.birthYear})`,
      })
    }
  }

  if (parent.deathYear !== null && child.birthYear !== null) {
    if (parent.deathYear < child.birthYear) {
      warnings.push({
        type: 'parent_died_before_child_birth',
        message: `Parent death year (${parent.deathYear}) before child birth year (${child.birthYear})`,
      })
    }
  }

  return warnings
}

// --- Tree Traversal ---

interface RawNode {
  entityId: string
  characterId: string
  name: string
  slug: string
  portraitUrl: string | null
  birthYear: number | null
  deathYear: number | null
  gender: string | null
  generation: number
}

/**
 * BFS traversal: gather nodes and edges up to `depth` generations in all directions.
 */
export function buildTree(
  focusEntityId: string,
  campaignId: string,
  depth: number,
  db: BetterSQLite3Database,
): Pick<GenealogyTree, 'nodes' | 'edges' | 'warnings'> & { rawNodes: Map<string, RawNode> } {
  const cappedDepth = Math.min(depth, MAX_DEPTH)
  const typeIds = getFamilyRelationTypeIds(db, campaignId)
  const parentOfId = typeIds['parent_of']
  const spouseOfId = typeIds['spouse_of']
  const siblingOfId = typeIds['sibling_of']

  const validTypeIds = [parentOfId, spouseOfId, siblingOfId].filter((id): id is string =>
    Boolean(id),
  )

  const rawNodes = new Map<string, RawNode>()
  const edges: GenealogyEdge[] = []
  const edgeSeen = new Set<string>()

  function loadNode(entityId: string, generation: number) {
    if (rawNodes.has(entityId)) {
      const existing = rawNodes.get(entityId)!
      // Update generation if we found a shorter path
      if (Math.abs(generation) < Math.abs(existing.generation)) {
        existing.generation = generation
      }
      return
    }

    const row = db
      .select({
        entityId: entities.id,
        characterId: characters.id,
        name: entities.name,
        slug: entities.slug,
        portraitUrl: characters.portraitUrl,
        birthYear: characters.birthYear,
        deathYear: characters.deathYear,
        gender: characters.gender,
      })
      .from(entities)
      .innerJoin(characters, eq(characters.entityId, entities.id))
      .where(eq(entities.id, entityId))
      .get()

    if (!row) return

    rawNodes.set(entityId, { ...row, generation })
  }

  // Batch-load relations for a set of entity IDs. Chunked at 900 to stay within SQLite's
  // 999 bind-parameter limit.
  const CHUNK_SIZE = 900
  function loadRelationsBatch(entityIds: string[]) {
    if (validTypeIds.length === 0 || entityIds.length === 0) return []
    const results = []
    for (let i = 0; i < entityIds.length; i += CHUNK_SIZE) {
      const chunk = entityIds.slice(i, i + CHUNK_SIZE)
      const rows = db
        .select()
        .from(entityRelations)
        .where(
          and(
            eq(entityRelations.campaignId, campaignId),
            inArray(entityRelations.relationTypeId, validTypeIds),
            or(
              inArray(entityRelations.sourceEntityId, chunk),
              inArray(entityRelations.targetEntityId, chunk),
            ),
          ),
        )
        .all()
      results.push(...rows)
    }
    return results
  }

  // BFS — process one level at a time so all nodes in a frontier are fetched in one query
  loadNode(focusEntityId, 0)
  // frontier: nodes to expand at the current distance
  let frontier: Array<{ entityId: string; generation: number; distance: number }> = [
    { entityId: focusEntityId, generation: 0, distance: 0 },
  ]
  // generationByEntityId: track the generation each entity was first assigned in this BFS pass
  const generationByEntityId = new Map<string, number>([[focusEntityId, 0]])

  while (frontier.length > 0) {
    const nextFrontier: Array<{ entityId: string; generation: number; distance: number }> = []

    // Batch-load all relations for the entire current frontier
    const frontierIds = frontier.map((f) => f.entityId)
    const relations = loadRelationsBatch(frontierIds)

    for (const { entityId, generation, distance } of frontier) {
      if (distance >= cappedDepth) continue

      const nodeRelations = relations.filter(
        (r) => r.sourceEntityId === entityId || r.targetEntityId === entityId,
      )

      for (const rel of nodeRelations) {
        const edgeKey = `${rel.id}`
        if (edgeSeen.has(edgeKey)) continue
        edgeSeen.add(edgeKey)

        const isSource = rel.sourceEntityId === entityId
        const otherId = isSource ? rel.targetEntityId : rel.sourceEntityId
        const slug = Object.entries(typeIds).find(([, id]) => id === rel.relationTypeId)?.[0]

        let otherGeneration = generation
        if (slug === 'parent_of') {
          // source = parent, target = child
          // if current is source (parent), other (child) is one generation below
          // if current is target (child), other (parent) is one generation above
          otherGeneration = isSource ? generation + 1 : generation - 1
        }
        // spouse_of and sibling_of keep same generation

        loadNode(otherId, otherGeneration)

        if (slug && ['parent_of', 'spouse_of', 'sibling_of'].includes(slug)) {
          edges.push({
            id: rel.id,
            sourceEntityId: rel.sourceEntityId,
            targetEntityId: rel.targetEntityId,
            type: slug as 'parent_of' | 'spouse_of' | 'sibling_of',
            label: isSource ? rel.forwardLabel : rel.reverseLabel,
          })
        }

        const alreadyQueued = generationByEntityId.has(otherId)
        if (!alreadyQueued || distance + 1 < cappedDepth) {
          if (!alreadyQueued) generationByEntityId.set(otherId, otherGeneration)
          nextFrontier.push({
            entityId: otherId,
            generation: otherGeneration,
            distance: distance + 1,
          })
        }
      }
    }

    frontier = nextFrontier
  }

  return { rawNodes, nodes: [], edges, warnings: [] }
}

// --- Layout ---

/**
 * Layered layout: assign x,y coordinates to each node.
 * Groups nodes by generation row, then positions within row.
 * Spouse pairs are treated as a super-node for positioning.
 */
export function layoutTree(
  rawNodes: Map<string, RawNode>,
  edges: GenealogyEdge[],
): GenealogyNode[] {
  // Group by generation
  const byGeneration = new Map<number, RawNode[]>()
  for (const node of rawNodes.values()) {
    const gen = node.generation
    if (!byGeneration.has(gen)) byGeneration.set(gen, [])
    byGeneration.get(gen)!.push(node)
  }

  // Build spouse pair sets for same-generation pairing
  const spouseEdges = edges.filter((e) => e.type === 'spouse_of')
  const spouseOf = new Map<string, string>()
  for (const edge of spouseEdges) {
    spouseOf.set(edge.sourceEntityId, edge.targetEntityId)
    spouseOf.set(edge.targetEntityId, edge.sourceEntityId)
  }

  const result: GenealogyNode[] = []

  for (const [generation, nodes] of byGeneration.entries()) {
    // Sort deterministically: birthYear asc (nulls last), then slug asc
    const sorted = [...nodes].sort((a, b) => {
      if (a.birthYear !== null && b.birthYear !== null) return a.birthYear - b.birthYear
      if (a.birthYear !== null) return -1
      if (b.birthYear !== null) return 1
      return a.slug.localeCompare(b.slug)
    })

    // Pair spouses together
    const ordered: RawNode[] = []
    const placed = new Set<string>()
    for (const node of sorted) {
      if (placed.has(node.entityId)) continue
      ordered.push(node)
      placed.add(node.entityId)
      const spouseId = spouseOf.get(node.entityId)
      if (spouseId && !placed.has(spouseId)) {
        const spouse = rawNodes.get(spouseId)
        if (spouse && spouse.generation === generation) {
          ordered.push(spouse)
          placed.add(spouseId)
        }
      }
    }

    const totalWidth = ordered.length * NODE_WIDTH + (ordered.length - 1) * NODE_H_GAP
    const startX = -totalWidth / 2

    for (let i = 0; i < ordered.length; i++) {
      const node = ordered[i]
      result.push({
        entityId: node.entityId,
        characterId: node.characterId,
        name: node.name,
        slug: node.slug,
        portraitUrl: node.portraitUrl,
        birthYear: node.birthYear,
        deathYear: node.deathYear,
        gender: node.gender,
        generation,
        x: startX + i * (NODE_WIDTH + NODE_H_GAP),
        y: generation * ROW_HEIGHT,
      })
    }
  }

  return result
}
