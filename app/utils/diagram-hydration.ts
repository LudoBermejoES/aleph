// Hydrates all entity-linked shapes with fresh data from batch endpoint
// Shape types that are entity-linked: npcToken, entityCard, locationPin, questNode, factionCard

type ShapeEditor = {
  getCurrentPageShapes: () => { id: string; type: string; props?: Record<string, unknown> }[]
  updateShapes: (shapes: { id: string; props: Partial<Record<string, unknown>> }[]) => void
}

const ENTITY_SHAPE_TYPES = ['npcToken', 'entityCard', 'locationPin', 'questNode', 'factionCard']

export async function hydrateEntityShapes(editor: unknown, campaignId: string): Promise<void> {
  const ed = editor as ShapeEditor

  const shapes = ed.getCurrentPageShapes()

  // Collect (shapeId, entityId) pairs
  const pairs: { shapeId: string; shapeType: string; entityId: string }[] = []
  for (const shape of shapes) {
    if (!ENTITY_SHAPE_TYPES.includes(shape.type)) continue
    const entityId = shape.props?.entityId
    if (typeof entityId === 'string' && entityId) {
      pairs.push({ shapeId: shape.id, shapeType: shape.type, entityId })
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

  for (const { shapeId, shapeType, entityId } of pairs) {
    const data = entityData[entityId]
    if (!data) continue

    let props: Partial<Record<string, unknown>> = {}

    if (shapeType === 'npcToken') {
      props = {
        characterName: data.name,
        portraitUrl: data.portraitUrl ?? undefined,
        statusBadge: data.status ?? undefined,
        tags: data.tags ?? [],
      }
    } else if (shapeType === 'entityCard') {
      props = {
        entityName: data.name,
        entityType: data.type,
        portraitUrl: data.portraitUrl ?? undefined,
      }
    } else if (shapeType === 'locationPin') {
      props = {
        locationName: data.name,
        locationImageUrl: data.portraitUrl ?? undefined,
      }
    } else if (shapeType === 'questNode') {
      props = {
        questTitle: data.name,
        status: data.status ?? 'planned',
      }
    } else if (shapeType === 'factionCard') {
      props = {
        factionName: data.name,
      }
    }

    updates.push({ id: shapeId, props })
  }

  if (updates.length > 0) {
    ed.updateShapes(updates)
  }
}

interface EntityData {
  id: string
  name: string
  type: string
  slug: string
  portraitUrl: string | null
  tags: string[]
  status: string | null
}
