import { eq, and, inArray, isNotNull } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { entities } from '../db/schema/entities'
import { entityRelations } from '../db/schema/relations'
import {
  organizations,
  organizationMembers,
  organizationLocations,
} from '../db/schema/organizations'
import { characters } from '../db/schema/characters'
import { quests, gameSessions } from '../db/schema/sessions'
import {
  buildNpcTokenShape,
  buildLocationPinShape,
  buildFactionCardShape,
  radialLayout,
} from './diagram-helpers'

export type DiagramType = 'entity-graph' | 'quest-tree' | 'faction-web' | 'session-timeline'

export interface GeneratedShape {
  id: string
  type: string
  x: number
  y: number
  props: Record<string, unknown>
}

export interface GeneratedBinding {
  id: string
  type: 'arrow'
  fromId: string
  toId: string
  label?: string
}

export interface GeneratedDiagram {
  shapes: GeneratedShape[]
  bindings: GeneratedBinding[]
}

function makeArrowBinding(fromId: string, toId: string, label?: string): GeneratedBinding {
  return { id: randomUUID(), type: 'arrow', fromId, toId, label }
}

// ─── Entity Graph ─────────────────────────────────────────────────────────────

export function generateEntityGraph(
  db: BetterSQLite3Database<Record<string, unknown>>,
  campaignId: string,
): GeneratedDiagram {
  const entityList = db
    .select({
      id: entities.id,
      name: entities.name,
      type: entities.type,
      slug: entities.slug,
    })
    .from(entities)
    .where(eq(entities.campaignId, campaignId))
    .limit(50)
    .all()

  if (entityList.length === 0) {
    throw new Error('No entities found for entity-graph generation')
  }

  const relations = db
    .select({
      sourceEntityId: entityRelations.sourceEntityId,
      targetEntityId: entityRelations.targetEntityId,
      forwardLabel: entityRelations.forwardLabel,
    })
    .from(entityRelations)
    .where(eq(entityRelations.campaignId, campaignId))
    .limit(100)
    .all()

  // Force-directed grid layout (simple approximation)
  const cols = Math.ceil(Math.sqrt(entityList.length))
  const shapes: GeneratedShape[] = entityList.map((entity, i) => {
    const isOrg = entity.type === 'organization'
    return {
      id: randomUUID(),
      type: isOrg ? 'factionCard' : 'entityCard',
      x: (i % cols) * 240 + 50,
      y: Math.floor(i / cols) * 120 + 50,
      props: isOrg
        ? {
            w: 180,
            h: 100,
            entityId: entity.id,
            campaignId,
            factionName: entity.name,
            slug: entity.slug,
          }
        : {
            w: 200,
            h: 80,
            entityId: entity.id,
            campaignId,
            entityName: entity.name,
            entityType: entity.type,
            slug: entity.slug,
          },
    }
  })

  const entityIdToShapeId = new Map(entityList.map((e, i) => [e.id, shapes[i]!.id]))

  const bindings: GeneratedBinding[] = []

  // Entity relation arrows
  for (const rel of relations) {
    const fromId = entityIdToShapeId.get(rel.sourceEntityId)
    const toId = entityIdToShapeId.get(rel.targetEntityId)
    if (fromId && toId) {
      bindings.push(makeArrowBinding(fromId, toId))
    }
  }

  // Org membership arrows: add factionCard shapes for orgs not already present
  const MAX_EXPANDED_ORGS = 50
  const entityIdSet = new Set(entityList.map((e) => e.id))
  const charEntityIds = entityList.filter((e) => e.type === 'character').map((e) => e.id)

  if (charEntityIds.length > 0) {
    const memberRows = db
      .select({
        characterEntityId: characters.entityId,
        characterId: characters.id,
        orgId: organizationMembers.organizationId,
      })
      .from(organizationMembers)
      .innerJoin(characters, eq(organizationMembers.characterId, characters.id))
      .where(inArray(characters.entityId, charEntityIds))
      .all()

    // Collect unique org IDs that need shapes
    const orgIdsNeeded = new Set<string>()
    for (const row of memberRows) {
      if (!entityIdToShapeId.has(row.orgId)) orgIdsNeeded.add(row.orgId)
    }

    // Fetch and create org shapes (capped)
    const orgIdsToCreate = Array.from(orgIdsNeeded).slice(0, MAX_EXPANDED_ORGS)
    if (orgIdsToCreate.length > 0) {
      const orgRows = db
        .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
        .from(organizations)
        .where(inArray(organizations.id, orgIdsToCreate))
        .all()

      // Place new org shapes after existing grid
      const startY = (Math.floor(entityList.length / cols) + 2) * 120 + 50
      for (let i = 0; i < orgRows.length; i++) {
        const org = orgRows[i]!
        const shape = buildFactionCardShape(
          org,
          campaignId,
          (i % cols) * 240 + 50,
          startY + Math.floor(i / cols) * 120,
        )
        shapes.push(shape)
        entityIdToShapeId.set(org.id, shape.id)
      }
    }

    // Create membership arrow bindings
    for (const row of memberRows) {
      const charShapeId = entityIdToShapeId.get(row.characterEntityId)
      const orgShapeId = entityIdToShapeId.get(row.orgId)
      if (charShapeId && orgShapeId) {
        bindings.push(makeArrowBinding(orgShapeId, charShapeId))
      }
    }
  }

  // Character → location arrows
  if (charEntityIds.length > 0) {
    const charLocRows = db
      .select({
        entityId: characters.entityId,
        locationEntityId: characters.locationEntityId,
      })
      .from(characters)
      .where(
        and(inArray(characters.entityId, charEntityIds), isNotNull(characters.locationEntityId)),
      )
      .all()

    for (const row of charLocRows) {
      if (!row.locationEntityId) continue
      const charShapeId = entityIdToShapeId.get(row.entityId)
      const locShapeId = entityIdToShapeId.get(row.locationEntityId)
      if (charShapeId && locShapeId) {
        bindings.push(makeArrowBinding(charShapeId, locShapeId))
      }
    }
  }

  // Org → location arrows
  const allOrgIdsOnDiagram = Array.from(entityIdToShapeId.keys()).filter(
    (id) => !entityIdSet.has(id) || entityList.find((e) => e.id === id)?.type === 'organization',
  )
  if (allOrgIdsOnDiagram.length > 0) {
    const orgLocRows = db
      .select({
        organizationId: organizationLocations.organizationId,
        locationEntityId: organizationLocations.locationEntityId,
      })
      .from(organizationLocations)
      .where(inArray(organizationLocations.organizationId, allOrgIdsOnDiagram))
      .all()

    for (const row of orgLocRows) {
      const orgShapeId = entityIdToShapeId.get(row.organizationId)
      const locShapeId = entityIdToShapeId.get(row.locationEntityId)
      if (orgShapeId && locShapeId) {
        bindings.push(makeArrowBinding(orgShapeId, locShapeId))
      }
    }
  }

  return { shapes, bindings }
}

// ─── Quest Tree ───────────────────────────────────────────────────────────────

export function generateQuestTree(
  db: BetterSQLite3Database<Record<string, unknown>>,
  campaignId: string,
): GeneratedDiagram {
  const questList = db
    .select()
    .from(quests)
    .where(eq(quests.campaignId, campaignId))
    .limit(50)
    .all()

  if (questList.length === 0) {
    throw new Error('No quests found for quest-tree generation')
  }

  const shapes: GeneratedShape[] = []
  const bindings: GeneratedBinding[] = []

  // Top-down tree layout: roots first, then children
  const roots = questList.filter((q) => !q.parentQuestId)
  const byParent = new Map<string, typeof questList>()
  for (const q of questList) {
    if (q.parentQuestId) {
      const list = byParent.get(q.parentQuestId) ?? []
      list.push(q)
      byParent.set(q.parentQuestId, list)
    }
  }

  const questToShapeId = new Map<string, string>()
  let col = 0

  function placeQuest(q: (typeof questList)[0], depth: number, colIdx: number): number {
    const shapeId = randomUUID()
    questToShapeId.set(q.id, shapeId)
    shapes.push({
      id: shapeId,
      type: 'questNode',
      x: colIdx * 240 + 50,
      y: depth * 100 + 50,
      props: {
        w: 200,
        h: 60,
        entityId: q.id,
        campaignId,
        questTitle: q.name,
        status: q.status,
        slug: q.slug,
      },
    })

    const children = byParent.get(q.id) ?? []
    let nextCol = colIdx
    for (const child of children) {
      nextCol = placeQuest(child, depth + 1, nextCol)
    }
    return Math.max(nextCol, colIdx + 1)
  }

  for (const root of roots) {
    col = placeQuest(root, 0, col)
  }

  // Add arrows for parent->child
  for (const q of questList) {
    if (q.parentQuestId) {
      const fromId = questToShapeId.get(q.parentQuestId)
      const toId = questToShapeId.get(q.id)
      if (fromId && toId) bindings.push(makeArrowBinding(fromId, toId))
    }
  }

  return { shapes, bindings }
}

// ─── Faction Web ─────────────────────────────────────────────────────────────

export function generateFactionWeb(
  db: BetterSQLite3Database<Record<string, unknown>>,
  campaignId: string,
): GeneratedDiagram {
  const MAX_MEMBERS_PER_ORG = 10

  // Try dedicated organizations table first, fall back to entities of type 'organization'
  const orgList = db
    .select()
    .from(organizations)
    .where(eq(organizations.campaignId, campaignId))
    .limit(20)
    .all()

  const items: { id: string; name: string; slug: string }[] =
    orgList.length > 0
      ? orgList
      : db
          .select({ id: entities.id, name: entities.name, slug: entities.slug })
          .from(entities)
          .where(and(eq(entities.campaignId, campaignId), eq(entities.type, 'organization')))
          .limit(20)
          .all()

  if (items.length === 0) {
    throw new Error('No organizations found for faction-web generation')
  }

  const shapes: GeneratedShape[] = []
  const bindings: GeneratedBinding[] = []

  // Calculate main radial layout for orgs
  const centerX = 400
  const centerY = 400
  const mainRadius = Math.max(600, items.length * 160)
  const orgPositions = radialLayout(centerX, centerY, items.length, mainRadius)

  // ── Pass 1: Create org shapes and collect all relationships ──────────────
  interface RelatedEntity {
    kind: 'character' | 'location'
    label: string
    data: { id: string; name: string; slug: string; portraitUrl?: string | null }
  }

  const orgShapeIds = new Map<string, string>() // orgId → shapeId
  const orgPositionMap = new Map<string, { x: number; y: number }>() // orgId → position
  // entityId → { entity data, orgIds that reference it, labels per org }
  const entityRelations = new Map<
    string,
    { entity: RelatedEntity; orgIds: string[]; labels: string[] }
  >()

  for (let i = 0; i < items.length; i++) {
    const org = items[i]!
    const pos = orgPositions[i]!
    const orgShape = buildFactionCardShape(org, campaignId, pos.x - 90, pos.y - 50)
    shapes.push(orgShape)
    orgShapeIds.set(org.id, orgShape.id)
    orgPositionMap.set(org.id, pos)

    const memberRows = db
      .select({
        entityId: characters.entityId,
        name: entities.name,
        slug: entities.slug,
        portraitUrl: characters.portraitUrl,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(characters, eq(organizationMembers.characterId, characters.id))
      .innerJoin(entities, eq(characters.entityId, entities.id))
      .where(eq(organizationMembers.organizationId, org.id))
      .limit(MAX_MEMBERS_PER_ORG)
      .all()

    const locationRows = db
      .select({
        id: entities.id,
        name: entities.name,
        slug: entities.slug,
      })
      .from(organizationLocations)
      .innerJoin(entities, eq(organizationLocations.locationEntityId, entities.id))
      .where(eq(organizationLocations.organizationId, org.id))
      .all()

    const related: RelatedEntity[] = [
      ...memberRows.map((m) => ({
        kind: 'character' as const,
        label: m.role || 'member',
        data: { id: m.entityId, name: m.name, slug: m.slug, portraitUrl: m.portraitUrl },
      })),
      ...locationRows.map((l) => ({
        kind: 'location' as const,
        label: 'location',
        data: l,
      })),
    ]

    for (const rel of related) {
      const existing = entityRelations.get(rel.data.id)
      if (existing) {
        existing.orgIds.push(org.id)
        existing.labels.push(rel.label)
      } else {
        entityRelations.set(rel.data.id, {
          entity: rel,
          orgIds: [org.id],
          labels: [rel.label],
        })
      }
    }
  }

  // ── Pass 2: Create entity shapes at optimal positions ────────────────────
  const entityIdToShapeId = new Map<string, string>()

  for (const [entityId, info] of entityRelations) {
    const { entity, orgIds, labels } = info

    // Compute position: midpoint of all referencing orgs
    let x = 0
    let y = 0
    for (const orgId of orgIds) {
      const orgPos = orgPositionMap.get(orgId)!
      x += orgPos.x
      y += orgPos.y
    }
    x /= orgIds.length
    y /= orgIds.length

    // For single-org entities, offset from the org center to avoid overlap
    if (orgIds.length === 1) {
      const orgPos = orgPositionMap.get(orgIds[0]!)!
      const dx = orgPos.x - centerX
      const dy = orgPos.y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      // Place 300px outward from the org (away from center)
      x = orgPos.x + (dx / dist) * 300
      y = orgPos.y + (dy / dist) * 300
    }

    const shape =
      entity.kind === 'character'
        ? buildNpcTokenShape(entity.data, campaignId, x - 70, y - 80)
        : buildLocationPinShape(entity.data, campaignId, x - 90, y - 30)
    shapes.push(shape)
    entityIdToShapeId.set(entityId, shape.id)

    // Create bindings from each referencing org
    for (let k = 0; k < orgIds.length; k++) {
      const orgShapeId = orgShapeIds.get(orgIds[k]!)!
      bindings.push(makeArrowBinding(orgShapeId, shape.id, labels[k]))
    }
  }

  return { shapes, bindings }
}

// ─── Session Timeline ─────────────────────────────────────────────────────────

export function generateSessionTimeline(
  db: BetterSQLite3Database<Record<string, unknown>>,
  campaignId: string,
): GeneratedDiagram {
  const sessionList = db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.campaignId, campaignId))
    .orderBy(gameSessions.sessionNumber)
    .limit(30)
    .all()

  if (sessionList.length === 0) {
    throw new Error('No sessions found for session-timeline generation')
  }

  const shapes: GeneratedShape[] = []
  const bindings: GeneratedBinding[] = []

  for (let i = 0; i < sessionList.length; i++) {
    const session = sessionList[i]!
    const shapeId = randomUUID()
    shapes.push({
      id: shapeId,
      type: 'entityCard',
      x: i * 260 + 50,
      y: 200,
      props: {
        w: 220,
        h: 70,
        entityId: session.id,
        campaignId,
        entityName: session.title,
        entityType: 'session',
        slug: session.slug,
      },
    })

    if (i > 0) {
      bindings.push(makeArrowBinding(shapes[i - 1]!.id, shapeId))
    }
  }

  return { shapes, bindings }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function generateDiagram(
  db: BetterSQLite3Database<Record<string, unknown>>,
  campaignId: string,
  type: DiagramType,
): GeneratedDiagram {
  switch (type) {
    case 'entity-graph':
      return generateEntityGraph(db, campaignId)
    case 'quest-tree':
      return generateQuestTree(db, campaignId)
    case 'faction-web':
      return generateFactionWeb(db, campaignId)
    case 'session-timeline':
      return generateSessionTimeline(db, campaignId)
    default:
      throw new Error(`Unknown diagram type: ${type}`)
  }
}

// Convert our generated diagram to a minimal tldraw-compatible snapshot
export function toTldrawSnapshot(generated: GeneratedDiagram): object {
  const shapeRecords = generated.shapes.map((s) => ({
    id: `shape:${s.id}`,
    typeName: 'shape',
    type: s.type,
    x: s.x,
    y: s.y,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    parentId: 'page:page',
    index: 'a1',
    props: s.props,
  }))

  // Convert bindings to tldraw arrow shapes + binding records.
  // Each GeneratedBinding becomes: 1 arrow shape + 2 binding records (start/end terminals).
  // This matches how syncRelations creates arrows client-side.
  const arrowRecords: Record<string, object> = {}
  for (const b of generated.bindings) {
    const arrowShapeId = `shape:${b.id}`
    // Arrow shape with placeholder positions (tldraw recalculates from bindings)
    arrowRecords[arrowShapeId] = {
      id: arrowShapeId,
      typeName: 'shape',
      type: 'arrow',
      x: 0,
      y: 0,
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {},
      parentId: 'page:page',
      index: 'a1',
      props: {
        kind: 'arc',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        bend: 0,
        color: 'grey',
        labelColor: 'black',
        fill: 'none',
        dash: 'draw',
        size: 's',
        arrowheadStart: 'none',
        arrowheadEnd: 'arrow',
        font: 'draw',
        richText: b.label
          ? {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: b.label }] }],
            }
          : { type: 'doc', content: [] },
        labelPosition: 0.5,
        scale: 1,
        elbowMidPoint: 0.5,
      },
    }
    // Start binding: arrow → source shape
    const startBindingId = `binding:${b.id}-start`
    arrowRecords[startBindingId] = {
      id: startBindingId,
      typeName: 'binding',
      type: 'arrow',
      fromId: arrowShapeId,
      toId: `shape:${b.fromId}`,
      meta: {},
      props: {
        terminal: 'start',
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
      },
    }
    // End binding: arrow → target shape
    const endBindingId = `binding:${b.id}-end`
    arrowRecords[endBindingId] = {
      id: endBindingId,
      typeName: 'binding',
      type: 'arrow',
      fromId: arrowShapeId,
      toId: `shape:${b.toId}`,
      meta: {},
      props: {
        terminal: 'end',
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
      },
    }
  }

  return {
    schema: {
      schemaVersion: 2,
      sequences: {},
    },
    store: {
      'document:document': {
        id: 'document:document',
        typeName: 'document',
        gridSize: 10,
        name: '',
        meta: {},
      },
      'page:page': {
        id: 'page:page',
        typeName: 'page',
        name: 'Page 1',
        index: 'a1',
        meta: {},
      },
      ...Object.fromEntries(shapeRecords.map((r) => [r.id, r])),
      ...arrowRecords,
    },
  }
}
