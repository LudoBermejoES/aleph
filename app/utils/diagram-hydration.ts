// Hydrates all entity-linked shapes with fresh data from batch endpoint
// Shape types that are entity-linked: npcToken, entityCard, locationPin, questNode, factionCard

import { getShapeImagePropKey } from './diagram-shapes'

type ShapeEditor = {
  getCurrentPageShapes: () => { id: string; type: string; props?: Record<string, unknown> }[]
  updateShapes: (shapes: { id: string; props: Partial<Record<string, unknown>> }[]) => void
}

const ENTITY_SHAPE_TYPES = ['npcToken', 'entityCard', 'locationPin', 'questNode', 'factionCard']

/**
 * The image a shape must show, per the per-shape override rule.
 *
 * A shape may carry `imageOverrideId`, the id of one of the entity's gallery
 * images. Hydration MUST respect it: it used to overwrite the image from the
 * primary on every load, which silently reverted any choice and read as a failed
 * save rather than as a design flaw.
 *
 *   override set AND present in the gallery -> that image's url
 *   otherwise                               -> the primary (today's behaviour)
 *
 * The fallback branch is what makes a DELETED image degrade to the primary
 * instead of leaving a broken image, so a stale override never needs cleaning up.
 */
export function resolveShapeImageUrl(
  data: Pick<EntityData, 'portraitUrl' | 'images'>,
  imageOverrideId: unknown,
): string | undefined {
  if (typeof imageOverrideId === 'string' && imageOverrideId) {
    const match = (data.images ?? []).find((img) => img && img.id === imageOverrideId)
    if (match?.url) return match.url
  }
  return data.portraitUrl ?? undefined
}

/**
 * The same rule as `resolveShapeImageUrl`, expressed in IDS instead of urls: which
 * gallery image a card is demonstrably showing right now. The picker needs an id to
 * mark a thumbnail with; hydration needs a url to render. Keeping the two faces of
 * the rule side by side is the point — a picker that marked `imageOverrideId`
 * directly marked NOTHING in the state every card starts in (no override, showing
 * the primary), which is the only state a reader sees the first time.
 *
 * Returns null when what is on screen is not in the gallery at all — an entity whose
 * `image_url` has no `entity_images` row — because marking a thumbnail that is not
 * what the card shows would be a lie.
 *
 * This is a READ and nothing more. It must never cause an override to be stored: a
 * card with no override goes on following the entity's primary until someone picks
 * something explicitly.
 */
export function resolveShownImageId(
  images: EntityImageRef[] | null | undefined,
  primaryUrl: string | null | undefined,
  imageOverrideId: unknown,
): string | null {
  const list = images ?? []
  if (typeof imageOverrideId === 'string' && imageOverrideId) {
    const match = list.find((img) => img && img.id === imageOverrideId)
    if (match?.url) return match.id
  }
  if (!primaryUrl) return null
  return list.find((img) => img && img.url === primaryUrl)?.id ?? null
}

export async function hydrateEntityShapes(editor: unknown, campaignId: string): Promise<void> {
  const ed = editor as ShapeEditor

  const shapes = ed.getCurrentPageShapes()

  // Collect (shapeId, entityId) pairs
  const pairs: {
    shapeId: string
    shapeType: string
    entityId: string
    imageOverrideId?: unknown
  }[] = []
  for (const shape of shapes) {
    if (!ENTITY_SHAPE_TYPES.includes(shape.type)) continue
    const entityId = shape.props?.entityId
    if (typeof entityId === 'string' && entityId) {
      pairs.push({
        shapeId: shape.id,
        shapeType: shape.type,
        entityId,
        imageOverrideId: shape.props?.imageOverrideId,
      })
    }
  }

  if (pairs.length === 0) return

  // Unique entityIds
  const uniqueEntityIds = [...new Set(pairs.map((p) => p.entityId))]

  // Batch into groups of 50
  const batches: string[][] = []
  for (let i = 0; i < uniqueEntityIds.length; i += 50) {
    batches.push(uniqueEntityIds.slice(i, i + 50))
  }

  // Fetch all batches in parallel
  const batchResults = await Promise.all(
    batches.map((batchIds) =>
      fetch(`/api/campaigns/${campaignId}/diagrams/entities/batch?ids=${batchIds.join(',')}`)
        .then((r) => {
          if (!r.ok) return {} as Record<string, EntityData>
          return r.json() as Promise<Record<string, EntityData>>
        })
        .catch(() => ({}) as Record<string, EntityData>),
    ),
  )

  // Merge all batch results
  const entityData: Record<string, EntityData> = Object.assign({}, ...batchResults)

  // Map results back to shape updates
  const updates: { id: string; props: Partial<Record<string, unknown>> }[] = []

  for (const { shapeId, shapeType, entityId, imageOverrideId } of pairs) {
    const data = entityData[entityId]
    if (!data) continue

    let props: Partial<Record<string, unknown>> = {}

    if (shapeType === 'npcToken') {
      props = {
        characterName: data.name,
        statusBadge: data.status ?? undefined,
        tags: data.tags ?? [],
      }
    } else if (shapeType === 'entityCard') {
      props = {
        entityName: data.name,
        entityType: data.type,
      }
    } else if (shapeType === 'locationPin') {
      props = {
        locationName: data.name,
      }
    } else if (shapeType === 'questNode') {
      props = {
        questTitle: data.name,
        status: data.status ?? 'planned',
      }
    } else if (shapeType === 'factionCard') {
      // factionCard used to get its name and NOTHING else, so an organization's
      // card kept the crest it was dropped with for ever (design D7).
      props = {
        factionName: data.name,
      }
    }

    // The image goes through the shared shapeType -> prop map, so the picker in
    // the diagram page and this loop can never write to different props.
    const imageKey = getShapeImagePropKey(shapeType)
    if (imageKey) {
      props[imageKey] = resolveShapeImageUrl(data, imageOverrideId)
    }

    updates.push({ id: shapeId, props })
  }

  if (updates.length > 0) {
    ed.updateShapes(updates)
  }
}

export interface EntityImageRef {
  id: string
  url: string
}

export interface EntityData {
  id: string
  name: string
  type: string
  slug: string
  portraitUrl: string | null
  tags: string[]
  status: string | null
  /**
   * The entity's gallery, ordered, as returned by `diagrams/entities/batch`.
   * Optional on purpose: until the server half ships, `images` is absent and
   * every shape falls back to the primary — exactly today's behaviour.
   */
  images?: EntityImageRef[] | null
}
