import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { entities } from '../db/schema/entities'
import { entityRelations } from '../db/schema/relations'
import { organizations } from '../db/schema/organizations'
import { quests, gameSessions } from '../db/schema/sessions'

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
}

export interface GeneratedDiagram {
  shapes: GeneratedShape[]
  bindings: GeneratedBinding[]
}

function makeArrowBinding(fromId: string, toId: string): GeneratedBinding {
  return { id: randomUUID(), type: 'arrow', fromId, toId }
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
  const shapes: GeneratedShape[] = entityList.map((entity, i) => ({
    id: randomUUID(),
    type: 'entityCard',
    x: (i % cols) * 240 + 50,
    y: Math.floor(i / cols) * 120 + 50,
    props: {
      w: 200,
      h: 80,
      entityId: entity.id,
      campaignId,
      entityName: entity.name,
      entityType: entity.type,
      slug: entity.slug,
    },
  }))

  const entityIdToShapeId = new Map(entityList.map((e, i) => [e.id, shapes[i]!.id]))

  const bindings: GeneratedBinding[] = []
  for (const rel of relations) {
    const fromId = entityIdToShapeId.get(rel.sourceEntityId)
    const toId = entityIdToShapeId.get(rel.targetEntityId)
    if (fromId && toId) {
      bindings.push(makeArrowBinding(fromId, toId))
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

  // Radial layout
  const centerX = 400
  const centerY = 400
  const radius = 300
  const shapes: GeneratedShape[] = items.map((org, i) => {
    const angle = (i / items.length) * 2 * Math.PI - Math.PI / 2
    return {
      id: randomUUID(),
      type: 'entityCard',
      x: centerX + Math.cos(angle) * radius - 100,
      y: centerY + Math.sin(angle) * radius - 30,
      props: {
        w: 200,
        h: 60,
        entityId: org.id,
        campaignId,
        entityName: org.name,
        entityType: 'organization',
        slug: org.slug,
      },
    }
  })

  return { shapes, bindings: [] }
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
    },
  }
}
