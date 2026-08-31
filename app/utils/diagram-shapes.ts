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
  'genealogyNode',
]

/**
 * Which prop each entity shape renders its image from. Single source of truth:
 * hydration writes it and the diagram page writes it when a card image is picked,
 * so the two cannot drift. A shape type absent from this map has no image at all
 * (`questNode`), and one whose image is not an entity image is deliberately out
 * (`mapToken` shows a map thumbnail, `anchorToken.targetUrl` is a link target,
 * `genealogyNode` is generated per view and never hydrated or double-clicked).
 */
export const SHAPE_IMAGE_PROP_KEY: Record<string, string> = {
  npcToken: 'portraitUrl',
  entityCard: 'portraitUrl',
  locationPin: 'locationImageUrl',
  factionCard: 'crestUrl',
}

/** The prop a shape type renders its image from, or undefined if it shows none */
export function getShapeImagePropKey(shapeType: string): string | undefined {
  return SHAPE_IMAGE_PROP_KEY[shapeType]
}

/** Whether a shape type can carry a per-shape image override */
export function supportsImageOverride(shapeType: string): boolean {
  return shapeType in SHAPE_IMAGE_PROP_KEY
}

/** Get the tldraw shape type for a given entity type, with fallback */
export function getShapeType(entityType: string): string {
  return ENTITY_TYPE_TO_SHAPE_TYPE[entityType] ?? 'entityCard'
}

/** Resolve the semantic entity type from a tldraw shape type */
export function getEntityTypeFromShape(shapeType: string): string {
  if (shapeType === 'npcToken') return 'character'
  if (shapeType === 'genealogyNode') return 'character'
  if (shapeType === 'factionCard') return 'organization'
  if (shapeType === 'locationPin') return 'location'
  if (shapeType === 'questNode') return 'quest'
  return 'entity'
}

interface EntityData {
  id: string
  /**
   * The id of this thing's row in `entities`, when its own `id` is something else.
   *
   * The palette returns organizations and quests from their OWN tables, so `id` is
   * an `organizations.id` / `quests.id` and the entities-row id travels in this
   * separate field. Everything downstream of a shape — `diagrams/entities/batch`,
   * hydration, the image gallery — is keyed on `entities.id`, so a shape that
   * stores the wrong one never refreshes anything. Nullable at the source: an
   * organization may legitimately have no `entities` row at all.
   */
  entityId?: string | null
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
  imageOverrideId?: string,
): { type: string; props: Record<string, unknown> } {
  const shapeType = getShapeType(entityType)
  const baseProps: Record<string, unknown> = {
    // Prefer the entities-row id over the source table's own id -- see EntityData.
    // `?? entity.id` is the fallback for a thing with no `entities` row (7 of the
    // 297 organizations, measured), which then behaves exactly as it does today:
    // `batch` resolves nothing for it and the card keeps what it was dropped with.
    entityId: entity.entityId ?? entity.id,
    campaignId,
    slug: entity.slug ?? '',
  }

  // A freshly dropped card shows the entity's primary image: no override yet.
  // Carried explicitly so the prop exists in the snapshot from the start.
  if (supportsImageOverride(shapeType)) {
    baseProps.imageOverrideId = imageOverrideId
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
          w: 140,
          h: 175,
          locationName: entity.name,
          locationImageUrl: entity.portraitUrl ?? entity.image ?? undefined,
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
