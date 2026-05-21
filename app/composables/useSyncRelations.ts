import { ref } from 'vue'
import { ENTITY_SHAPE_TYPES } from '~/utils/diagram-shapes'

export interface EditorForSync {
  getCurrentPageShapes: () => { id: string; type: string; props?: Record<string, unknown> }[]
  createShape: (shape: Record<string, unknown>) => unknown
  createBinding: (binding: Record<string, unknown>) => void
  getBindingsFromShape: (
    shapeId: string,
    type: string,
  ) => { toId: string; props: { terminal: string } }[]
}

interface GraphEdge {
  source: string
  target: string
  label?: string
  relationTypeSlug?: string
  attitude?: number
}

/** Map relation type to tldraw named color */
export function relationTypeToColor(relationTypeSlug?: string, attitude?: number): string {
  if (
    relationTypeSlug === 'rival' ||
    relationTypeSlug === 'enemy' ||
    (attitude !== undefined && attitude < 0)
  )
    return 'red'
  if (relationTypeSlug === 'family') return 'violet'
  if (relationTypeSlug === 'member') return 'violet'
  if (relationTypeSlug === 'mentor') return 'blue'
  if (relationTypeSlug === 'location') return 'orange'
  if (relationTypeSlug === 'ally' || (attitude !== undefined && attitude >= 70)) return 'green'
  return 'grey'
}

/**
 * Composable for syncing campaign relations as tldraw arrows on the canvas.
 * Returns a `syncRelations()` function and a `syncing` ref for loading state.
 */
export function useSyncRelations(
  getEditor: () => EditorForSync | null,
  campaignId: string,
  translateLabel: (label: string | undefined | null) => string,
) {
  const syncing = ref(false)

  async function syncRelations(): Promise<number> {
    const ed = getEditor()
    if (!ed) return 0

    // Collect entityId → shapeId map
    const entityToShape = new Map<string, string>()
    for (const shape of ed.getCurrentPageShapes()) {
      if (ENTITY_SHAPE_TYPES.includes(shape.type) && shape.props?.entityId) {
        const eid = shape.props.entityId as string
        if (!entityToShape.has(eid)) entityToShape.set(eid, shape.id)
      }
    }
    if (entityToShape.size < 2) return 0

    syncing.value = true
    // Fetch graph
    let graphData: { edges: Record<string, GraphEdge> }
    try {
      graphData = await $fetch(`/api/campaigns/${campaignId}/graph`)
    } catch {
      syncing.value = false
      return 0
    }

    // Find existing arrow pairs to avoid duplicates
    const existingArrows = new Set<string>()
    for (const shape of ed.getCurrentPageShapes()) {
      if (shape.type !== 'arrow') continue
      const bindings = ed.getBindingsFromShape(shape.id, 'arrow')
      const startBinding = bindings.find((b) => b.props.terminal === 'start')
      const endBinding = bindings.find((b) => b.props.terminal === 'end')
      if (startBinding && endBinding) {
        existingArrows.add(`${startBinding.toId}→${endBinding.toId}`)
      }
    }

    // Create arrows
    let created = 0
    for (const edge of Object.values(graphData.edges)) {
      const fromShapeId = entityToShape.get(edge.source)
      const toShapeId = entityToShape.get(edge.target)
      if (!fromShapeId || !toShapeId) continue
      if (existingArrows.has(`${fromShapeId}→${toShapeId}`)) continue

      const color = relationTypeToColor(edge.relationTypeSlug, edge.attitude)
      const arrowId = `shape:${crypto.randomUUID()}` as `shape:${string}`
      try {
        const label = translateLabel(edge.label)
        ed.createShape({
          id: arrowId,
          type: 'arrow',
          props: {
            start: { x: 0, y: 0 },
            end: { x: 100, y: 0 },
            richText: {
              type: 'doc',
              content: label
                ? [{ type: 'paragraph', content: [{ type: 'text', text: label }] }]
                : [],
            },
            color,
            size: 's',
          },
        })
        ed.createBinding({
          type: 'arrow',
          fromId: arrowId,
          toId: fromShapeId,
          props: {
            terminal: 'start',
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false,
            isPrecise: false,
          },
        })
        ed.createBinding({
          type: 'arrow',
          fromId: arrowId,
          toId: toShapeId,
          props: {
            terminal: 'end',
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false,
            isPrecise: false,
          },
        })
        created++
      } catch (err) {
        console.error('[syncRelations] failed to create arrow:', err)
      }
    }

    syncing.value = false
    return created
  }

  return { syncRelations, syncing }
}
