/**
 * Shared diagram shape utilities — single source of truth for entity type → shape type
 * mapping and shape prop construction. Used by composables, page components, and can be
 * mirrored by server-side diagram-helpers.ts.
 */

/** Canonical mapping from entity type to tldraw shape type */
export const ENTITY_TYPE_TO_SHAPE_TYPE: Record<string, string> = {
  character: 'npcToken',
  location: 'locationPin',
  quest: 'questNode',
  organization: 'factionCard',
  wiki: 'entityCard',
  entity: 'entityCard',
}

/** All tldraw shape types that represent entities (for selection detection) */
export const ENTITY_SHAPE_TYPES = [
  'npcToken',
  'entityCard',
  'locationPin',
  'questNode',
  'factionCard',
]

/** Get the tldraw shape type for a given entity type, with fallback */
export function getShapeType(entityType: string): string {
  return ENTITY_TYPE_TO_SHAPE_TYPE[entityType] ?? 'entityCard'
}

/** Resolve the semantic entity type from a tldraw shape type */
export function getEntityTypeFromShape(shapeType: string): string {
  if (shapeType === 'npcToken') return 'character'
  if (shapeType === 'factionCard') return 'organization'
  if (shapeType === 'locationPin') return 'location'
  if (shapeType === 'questNode') return 'quest'
  return 'entity'
}

interface EntityData {
  id: string
  name: string
  slug: string
  portraitUrl?: string | null
  image?: string | null
  status?: string | null
  entityType?: string
  type?: string
}

/**
 * Build shape props for editor.createShape(). Returns { type, props } ready to spread
 * into the createShape call (caller adds x, y).
 */
export function buildShapeCreateArgs(
  entityType: string,
  entity: EntityData,
  campaignId: string,
): { type: string; props: Record<string, unknown> } {
  const shapeType = getShapeType(entityType)
  const baseProps: Record<string, unknown> = {
    entityId: entity.id,
    campaignId,
    slug: entity.slug ?? '',
  }

  switch (shapeType) {
    case 'npcToken':
      return {
        type: 'npcToken',
        props: {
          ...baseProps,
          w: 140,
          h: 160,
          characterName: entity.name,
          portraitUrl: entity.portraitUrl ?? entity.image ?? undefined,
        },
      }
    case 'locationPin':
      return {
        type: 'locationPin',
        props: {
          ...baseProps,
          w: 180,
          h: 60,
          locationName: entity.name,
        },
      }
    case 'questNode':
      return {
        type: 'questNode',
        props: {
          ...baseProps,
          w: 200,
          h: 60,
          questTitle: entity.name,
          status: entity.status ?? 'planned',
        },
      }
    case 'factionCard':
      return {
        type: 'factionCard',
        props: {
          ...baseProps,
          w: 140,
          h: 160,
          factionName: entity.name,
          crestUrl: entity.portraitUrl ?? entity.image ?? undefined,
        },
      }
    default:
      return {
        type: 'entityCard',
        props: {
          ...baseProps,
          w: 200,
          h: 80,
          entityName: entity.name,
          entityType: entityType,
          portraitUrl: entity.portraitUrl ?? entity.image ?? undefined,
        },
      }
  }
}
